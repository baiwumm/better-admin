import Link from "next/link";

import { BouncyAccordion } from "@/components/landing/bouncy-accordion";
import { FAQ_ITEMS } from "@/lib/faq";
import { SITE } from "@/lib/site";

export function Faq() {
  return (
    <section className="border-b border-dashed border-black/10 dark:border-white/10">
      <div className="mx-auto w-full max-w-3xl space-y-7 px-6 py-16 md:py-24">
        <div className="space-y-2 text-center">
          <h2 className="text-balance text-3xl font-bold md:text-4xl">
            常见问题
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-muted-foreground">
            关于 Better Admin 的常见问题。
          </p>
        </div>
        <BouncyAccordion
          defaultValue="what-is"
          items={FAQ_ITEMS.map((item) => ({
            id: item.value,
            title: item.title,
            description: item.content,
          }))}
        />
        <p className="text-center text-muted-foreground">
          没有找到想问的？欢迎在{" "}
          <Link
            className="text-foreground underline underline-offset-4"
            href={SITE.github}
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </Link>{" "}
          提出 Issue。
        </p>
      </div>
    </section>
  );
}
