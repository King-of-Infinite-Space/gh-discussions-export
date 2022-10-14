import "https://deno.land/std@0.153.0/dotenv/load.ts" // load env vars from .env
import YAML from "https://esm.sh/yaml@2.1.1"
import RSS from "https://esm.sh/rss@1.2.2"
import { join } from "https://deno.land/std@0.153.0/path/mod.ts"
import config from "./config.js"

const sourceRepo = config.sourceRepo || Deno.env.get("GITHUB_REPOSITORY")
const [owner, repo] = sourceRepo.split("/")
const token = Deno.env.get("GITHUB_TOKEN")

async function fetchDiscussionsApi(
  repo,
  owner,
  token,
  perPage = 20,
  endCursor = null
) {
  const results = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
    },
    body: JSON.stringify({
      query: `query {
      repository(name: "${repo}", owner: "${owner}") {
        discussions(
          orderBy: {field: CREATED_AT, direction: DESC}
          first: ${perPage}
          ${endCursor ? `after: "${endCursor}"` : ""}
        ) {
          nodes {
            title
            number
            url
            createdAt
            lastEditedAt
            updatedAt
            body
            bodyText
            bodyHTML
            author {
              login
            }
            category {
              name
            }
            labels (first: 100) {
              nodes {
                name
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }`,
    }),
  }).then((res) => res.json())
  return results
}

async function fetchAllDiscussions(repo, owner, token) {
  let hasNextPage = true
  let endCursor = null
  let allDiscussions = []
  while (hasNextPage) {
    const results = await fetchDiscussionsApi(
      repo,
      owner,
      token,
      100,
      endCursor
    )
    const discussions = results.data.repository.discussions.nodes
    hasNextPage = results.data.repository.discussions.pageInfo.hasNextPage
    endCursor = results.data.repository.discussions.pageInfo.endCursor
    allDiscussions = allDiscussions.concat(discussions)
  }
  return allDiscussions
}

/**
 * filter and add info to post data
 * make labelList for homepage
 * @param {Array} rawPostList
 * @returns {Array} postList
 */
function processPosts(rawPostList) {
  const postList = []
  rawPostList.forEach((rawPost) => {
    if (
      (config.categoriesWhitelist.length == 0 ||
        config.categoriesWhitelist.includes(rawPost.category.name)) &&
      (config.authorsWhitelist.length == 0 ||
        config.authorsWhitelist.includes(rawPost.author))
    ) {
      const post = Object.assign({}, rawPost)

      // flatten the dict
      post.author = rawPost.author.login
      post.category = rawPost.category.name
      post.labels = rawPost.labels.nodes?.map((label) => label.name) || []
      Object.assign(post, config.extraFrontmatterPost(post))
      postList.push(post)
    }
  })
  return postList
}

/**
 * Process post data.
 * @param {Array[Object]} postList
 * @returns {Array[Object]} labelList
 */
function getLabelsAndCategories(postList) {
  const labelDict = {}
  const categoryDict = {}
  postList.forEach((post) => {
    if (!categoryDict[post.category]) {
      categoryDict[post.category] = {
        name: post.category,
        count: 0,
      }
    }
    categoryDict[post.category].count += 1

    post.labels.forEach((label) => {
      if (!labelDict[label]) {
        labelDict[label] = {
          name: label,
          count: 0,
        }
      }
      labelDict[label].count += 1
    })
  })

  const labelList = Object.values(labelDict).sort((a, b) => b.count - a.count)
  const categoryList = Object.values(categoryDict).sort(
    (a, b) => b.count - a.count
  )
  return [labelList, categoryList]
}

/**
 * Write Discussions to markdown file.
 * @param {Array[Object]} postList processed post data object.
 */
function writePosts(postList) {
  postList.forEach((post) => {
    const filename = config.formatFilename(post)

    const { body, bodyText, bodyHTML, ...frontmatter } = post
    const contentBody = config.formatPostBody(post)

    const content = config.postUseJson
      ? `---\n${JSON.stringify(frontmatter, null, "\t")}\n---\n\n${contentBody}`
      : `---\n${YAML.stringify(frontmatter)}---\n\n${contentBody}`
    // yaml already has a newline at the end

    Deno.writeTextFileSync(
      join(config.outputDir, config.postSubDir, `${filename}.md`),
      content
    )
  })
}

/**
 * Write data to home page read me.
 * @param {Array} postList
 * @param {Array} labelList
 */
function writeIndex(postList, labelList, categoryList) {
  const metadata = Object.assign({}, config.extraFrontmatterIndex)
  metadata.categories = categoryList
  metadata.labels = labelList
  metadata.posts = postList.map((post) => {
    const { body, bodyText, bodyHTML, ...rest } = post
    return rest
  })
  Object.assign(metadata, config.extraFrontmatterIndex(metadata))
  const content = config.homeUseJson
    ? `---\n${JSON.stringify(metadata, null, "\t")}\n---\n`
    : `---\n${YAML.stringify(metadata)}---\n`
  Deno.writeTextFileSync(join(config.outputDir, `index.md`), content)
}

/**
 * Write Discussions to json feed.
 * @param {Array[Object]} postList processed post data object.
 * @param {Number} number how many posts to include in the feed.
 */
function writeJsonFeed(postList) {
  // for details see https://www.jsonfeed.org/version/1.1/
  const filename = "feed.json"
  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: `${owner}/${repo}/discussions`,
    // above are required fields
    home_page_url: `https://github.com/${owner}/${repo}/discussions`,
    feed_url: `https://cdn.jsdelivr.net/gh/${owner}/${repo}/${join(
      config.outputDir,
      filename
    )}`,
    // above are strongly recommended fields
    items: [],
  }
  let i = 0
  for (const post of postList) {
    feed.items.push({
      id: post.url,
      // required
      url: post.url,
      title: post.title,
      content_html: post.bodyHTML,
      date_published: post.createdAt,
      date_modified: post.lastEditedAt,
      authors: [post.author],
      tags: post.labels,
    })
    i++
    if (i >= config.feedPostCount) {
      break
    }
  }

  Deno.writeTextFileSync(
    join(config.outputDir, filename),
    JSON.stringify(feed, null, "\t")
  )
}

/**
 * Write Discussions to rss feed.
 * @param {Array[Object]} postList processed post data object.
 * @param {Number} number how many posts to include in the feed.
 */
function writeRssFeed(postList) {
  // for details see https://www.npmjs.com/package/rss
  const filename = "feed.rss"
  const feed = new RSS({
    title: `${owner}/${repo}/discussions`,
    site_url: `https://github.com/${owner}/${repo}/discussions`,
    feed_url: `https://cdn.jsdelivr.net/gh/${owner}/${repo}/${join(
      config.outputDir,
      filename
    )}`,
  })
  let i = 0
  for (const post of postList) {
    feed.item({
      url: post.url,
      title: post.title,
      description: post.bodyHTML,
      date: post.createdAt,
      // above are required fields
      author: post.author,
      categories: post.labels,
    })
    i++
    if (i >= config.feedPostCount) {
      break
    }
  }

  Deno.writeTextFileSync(join(config.outputDir, filename), feed.xml())
}

async function main() {
  console.log("Fetching discussions")
  const rawPostList = await fetchAllDiscussions(repo, owner, token)
  console.log(`\tFetched ${rawPostList.length} discussions`)

  console.log("Processing posts and labels")
  const postList = processPosts(rawPostList)
  const [labelList, categoryList] = getLabelsAndCategories(postList)

  console.log("Preparing folders")
  const postDir = join(config.outputDir, config.postSubDir)
  try {
    Deno.removeSync(config.outputDir, {
      recursive: true,
    })
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) {
      throw e
    }
  }
  Deno.mkdirSync(postDir, {
    recursive: true,
  })
  console.log("\tposts will be saved to", postDir)

  console.log("Writing files")
  writePosts(postList)
  console.log("\tWrote post files")
  if (config.generateIndex) {
    writeIndex(postList, labelList, categoryList)
    console.log("\tWrote index.md")
  }
  if (config.generateJsonFeed) {
    writeJsonFeed(postList)
    console.log("\tWrote json feed")
  }
  if (config.generateRssFeed) {
    writeRssFeed(postList)
    console.log("\tWrote rss feed")
  }
  console.log("Done")
}

main()
