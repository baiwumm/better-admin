import { notFound } from "next/navigation";
import { DocPage } from "@/components/docs/doc-page";
import { Toc } from "@/components/docs/toc";
import { getMDXComponents } from "@/mdx-components";
import { source } from "@/lib/source";

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_220px] xl:gap-10">
      <DocPage
        tree={source.pageTree}
        url={page.url}
        title={page.data.title}
        description={page.data.description}
      >
        <MDX components={getMDXComponents()} />
      </DocPage>

      {/* 目录列：xl 以下由正文流内的锚点替代，不渲染 */}
      <aside className="hidden xl:block">
        <div className="docs-scrollbar sticky top-22 max-h-[calc(100dvh-7rem)] overflow-y-auto">
          <Toc items={page.data.toc} />
        </div>
      </aside>
    </div>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) return {};

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
