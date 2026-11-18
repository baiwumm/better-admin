import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import { notFound } from "next/navigation";

import { getMDXComponents } from "@/mdx-components";
import { JsonLd } from "@/components/seo/json-ld";
import { OG_IMAGE, SITE } from "@/lib/site";
import { source } from "@/lib/source";

/** next.config 开启了 trailingSlash，canonical 必须与线上实际地址同形 */
function getCanonical(url: string) {
  return url.endsWith("/") ? url : `${url}/`;
}

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await props.params;
  const page = source.getPage(slug);

  if (!page) notFound();

  const MDX = page.data.body;
  const canonical = getCanonical(page.url);
  const updated = page.data.lastModified;
  const updatedLabel = updated
    ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "long" }).format(updated)
    : null;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: page.data.title,
    description: page.data.description,
    url: new URL(canonical, SITE.url).toString(),
    mainEntityOfPage: new URL(canonical, SITE.url).toString(),
    inLanguage: "zh-CN",
    image: new URL(OG_IMAGE.url, SITE.url).toString(),
    author: { "@id": `${SITE.url}/#organization` },
    publisher: { "@id": `${SITE.url}/#organization` },
    isPartOf: { "@id": `${SITE.url}/#website` },
    ...(updated ? { dateModified: updated.toISOString() } : {}),
  };

  return (
    <DocsPage toc={page.data.toc}>
      <JsonLd data={articleJsonLd} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      {updatedLabel ? (
        <p className="text-sm text-muted-foreground">
          最后更新：{updatedLabel}
        </p>
      ) : null}
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
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

  const canonical = new URL(getCanonical(page.url), SITE.url).toString();
  const updated = page.data.lastModified;
  const socialTitle = `${page.data.title} — ${SITE.name}`;

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "article",
      url: canonical,
      title: socialTitle,
      description: page.data.description,
      images: [OG_IMAGE],
      ...(updated ? { modifiedTime: updated.toISOString() } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: page.data.description,
      images: [OG_IMAGE],
    },
  };
}
