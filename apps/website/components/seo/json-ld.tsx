/**
 * JSON-LD 输出组件
 *
 * 数据全部来自构建期静态常量，不接受用户输入；仍对 `<` 做转义，
 * 避免正文里出现 `</script>` 时提前闭合脚本标签。
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      dangerouslySetInnerHTML={{ __html: json }}
      type="application/ld+json"
    />
  );
}
