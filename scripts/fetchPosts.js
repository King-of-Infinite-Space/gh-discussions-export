import "https://deno.land/std@0.153.0/dotenv/load.ts" // load env vars from .env
import YAML from "https://esm.sh/yaml@2.1.1"
import uslug from "https://esm.sh/uslug@1.0.4"

import { countWordsRounded } from "./countWords.js"
import config from "./config.js"

const sourceRepo = config.sourceRepo || Deno.env.get("GITHUB_REPOSITORY")
const [owner, repo] = sourceRepo.split("/")
const token = Deno.env.get("GITHUB_TOKEN")

function getExcerpt(text) {
  const firstPara = text.split("\n\n")[0]
  let excerpt = firstPara.slice(0, 100)
  const split = excerpt.split("\n")
  if (split.length >= 3) {
    excerpt = split.slice(0, 2).join("\n")
  }
  return excerpt
}

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
            url
            createdAt
            lastEditedAt
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

      // add info
      const wordCounts = countWordsRounded(post.bodyText)
      post.countZH = wordCounts.zh
      post.countEN = wordCounts.en
      post.excerpt = getExcerpt(post.bodyText) // for preview and possibly SEO

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
function getLabelList(postList) {
  const labelDict = {}
  postList.forEach((post) => {
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

  return labelList
}

/**
 * Write Discussions to markdown file.
 * @param {Array[Object]} postList processed post data object.
 */
function writePosts(postList) {
  postList.forEach((post) => {
    const filename =
      new Date(post.createdAt).toISOString().slice(2, 7).replace("-", "") +
      "-" +
      uslug(post.title.replace(/\/|\./g, "-"))

    const frontmatter = Object.assign({}, post)
    delete frontmatter.body
    delete frontmatter.bodyText
    delete frontmatter.bodyHTML

    const content = config.postUseJson
      ? `---\n${JSON.stringify(frontmatter, null, "\t")}\n---\n\n${post.body}`
      : `---\n${YAML.stringify(frontmatter)}\n---\n\n${post.body}`

    Deno.writeTextFileSync(`${config.outputDir}/${filename}.md`, content)
  })
}

/**
 * Write data to home page read me.
 * @param {Array} postList
 * @param {Array} labelList
 */
function writeMetadata(postList, labelList, yaml = true) {
  const metadata = {}
  metadata.labels = labelList
  metadata.posts = postList.map((post) => {
    const { body, bodyText, bodyHTML, ...rest } = post
    return rest
  })
  const content = config.homeUseJson
    ? `---\n${JSON.stringify(metadata, null, "\t")}\n---\n`
    : `---\n${YAML.stringify(metadata)}\n---\n`
  Deno.writeTextFileSync(`${config.outputDir}/index.md`, content)
}

/**
 * Write Discussions to json feed.
 * @param {Array[Object]} postList processed post data object.
 * @param {Number} number how many posts to include in the feed.
 */
function writeFeed(postList) {
  // for details see https://www.jsonfeed.org/version/1.1/
  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: `${owner}/${repo}/discussions`,
    // above are required fields
    home_page_url: `https://github.com/${owner}/${repo}/discussions`,
    // feed_url: `https://raw.githubusercontent.com/${owner}/${repo}/main/${config.outputDir}/feed.json`,
    // above are strongly recommended fields
    ...config.feedTopInfo,
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
      ...config.feedPostInfo(post),
    })
    i++
    if (i >= config.feedPostCount) {
      break
    }
  }

  Deno.writeTextFileSync(
    `${config.outputDir}/feed.json`,
    JSON.stringify(feed, null, "\t")
  )
}

async function main() {
  console.log("Fetching discussions")
  const rawPostList = await fetchAllDiscussions(repo, owner, token)
  console.log(`\tFetched ${rawPostList.length} discussions`)
  console.log("Processing posts and labels")
  const postList = processPosts(rawPostList)
  const labelList = getLabelList(postList)
  console.log("Writing files")
  try {
    Deno.mkdirSync(config.outputDir)
  } catch (e) {
    if (!e instanceof Deno.errors.AlreadyExists) {
      throw e
    }
  }
  writePosts(postList)
  console.log("\tWrote post files")
  if (config.generateIndex) {
    writeMetadata(postList, labelList)
    console.log("\tWrote index.md")
  }
  if (config.generateFeed) {
    writeFeed(postList)
    console.log("\tWrote feed.json")
  }
  console.log("Done")
  // writeFeed(postData)
  // may use VuePress instead
}

main()
