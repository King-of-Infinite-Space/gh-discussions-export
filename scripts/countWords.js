import wordsCount from "https://esm.sh/words-count@2.0.2"

function countWords(text) {
  const punctuations = "『』「」《》〈〉【】〖〗…—-+_=|　".split("")
  const total = wordsCount(text, {
    punctuation: punctuations,
    punctuationAsBreaker: true,
    disableDefaultPunctuation: false,
  })
  // default punctuations see https://github.com/byn9826/words-count/blob/master/src/globalWordsCount.js
  let cjk = 0
  let number = 0
  const regexChineseChar = /[\u4E00-\u9FA5\uF900-\uFA2D]/
  const regexNumber = /[0-9]/
  // range taken from https://github.com/holmescn/vscode-wordcount-cjk/blob/master/src/WordCounter.ts
  for (let i = 0; i < text.length; i++) {
    if (regexChineseChar.test(text[i])) {
      cjk += 1
    }
    if (regexNumber.test(text[i])) {
      if (i === 0 || !regexNumber.test(text[i - 1])) {
        number += 1
      }
    }
  }
  let other = total - cjk - number
  other = Math.max(0, other)
  return {
    cjk: cjk,
    number: number,
    other: other,
  }
}

function roundWordCounts({ cjk, number, other }, round = 10, minimum = 10) {
  let zh = 0
  let en = 0
  if (cjk / (other + 1e-5) > 10) {
    // primarily Chinese
    zh = cjk + number
  } else if (cjk / (other + 1e-5) < 0.1) {
    en = other + number
  } else {
    zh = cjk + Math.ceil(number / 2)
    en = other + Math.floor(number / 2)
  }
  zh *= Number(zh >= minimum)
  en *= Number(en >= minimum)
  zh = Math.round(zh / round) * round
  en = Math.round(en / round) * round
  return {
    zh: zh,
    en: en,
  }
}

export function countWordsRounded(text, round = 10, minimum = 10) {
  const { cjk, number, other } = countWords(text)
  return roundWordCounts({ cjk, number, other }, round, minimum)
}
