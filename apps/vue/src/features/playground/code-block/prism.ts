/**
 * prismjs 装配：core + 演示所需语言（按需注册，不走 `prismjs/components/index` 全量引入）。
 * 注册顺序有依赖：jsx 依赖 markup + javascript，tsx 依赖 jsx + typescript。
 * `Prism.manual` 置位关闭 DOMContentLoaded 自动 highlightAll（本组件自行 tokenize 渲染）。
 */
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";

Prism.manual = true;

/** 单个渲染 token：类型链（`plain` 或 prism 语义类型 + alias）+ 单行文本片段。 */
export type LineToken = { types: string[]; content: string; empty?: boolean };

const NEWLINE_RE = /\r\n|\r|\n/;

function normalizeEmptyLines(line: LineToken[]) {
  if (line.length === 0) {
    line.push({ types: ["plain"], content: "\n", empty: true });
  } else if (line.length === 1 && line[0].content === "") {
    line[0].content = "\n";
    line[0].empty = true;
  }
}

function appendTypes(types: string[], add: string | string[]): string[] {
  const last = types[types.length - 1];

  if (types.length > 0 && last === add) return types;

  return types.concat(add);
}

type PrismContent = string | Prism.Token | (string | Prism.Token)[];

/**
 * 把 prism 的嵌套 token 树展平为「行 × token」二维数组（语义与 prism-react-renderer 的 normalizeTokens 一致）：
 * 跨行 token（多行注释 / 模板字符串）按换行切开，每行独立渲染，行号与高亮行才能逐行落位。
 */
export function tokenizeLines(code: string, language: string): LineToken[][] {
  const grammar = Prism.languages[language];
  // 未注册的语言降级为纯文本单 token
  const tokens: (string | Prism.Token)[] = grammar
    ? Prism.tokenize(code, grammar)
    : [code];

  const typeStack: string[][] = [[]];
  const tokenStack: (string | Prism.Token)[][] = [tokens];
  const sizeStack = [tokens.length];
  const indexStack = [0];

  let depth = 0;
  let currentLine: LineToken[] = [];
  const lines = [currentLine];

  while (depth > -1) {
    let i: number;

    while ((i = indexStack[depth]++) < sizeStack[depth]) {
      let types = typeStack[depth];
      let content: PrismContent;
      const token = tokenStack[depth][i];

      if (typeof token === "string") {
        types = depth > 0 ? types : ["plain"];
        content = token;
      } else {
        types = appendTypes(types, token.type);
        if (token.alias) types = appendTypes(types, token.alias);
        content = token.content;
      }

      if (typeof content !== "string") {
        const nested = Array.isArray(content) ? content : [content];

        depth++;
        typeStack.push(types);
        tokenStack.push(nested);
        sizeStack.push(nested.length);
        indexStack.push(0);
        continue;
      }

      const parts = content.split(NEWLINE_RE);

      currentLine.push({ types, content: parts[0] });

      for (let j = 1; j < parts.length; j++) {
        normalizeEmptyLines(currentLine);
        currentLine = [];
        lines.push(currentLine);
        currentLine.push({ types, content: parts[j] });
      }
    }

    depth--;
    typeStack.pop();
    tokenStack.pop();
    sizeStack.pop();
    indexStack.pop();
  }

  normalizeEmptyLines(currentLine);

  return lines;
}
