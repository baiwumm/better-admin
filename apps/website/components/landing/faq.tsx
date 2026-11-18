import { Accordion, Typography } from "@heroui/react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

import { SectionHeader } from "@/components/landing/section-header";
import { FAQ_ITEMS } from "@/lib/faq";
import { SITE } from "@/lib/site";

export function Faq() {
  return (
    <section className="border-t border-border" id="faq">
      <div className="mx-auto w-full max-w-3xl px-6 py-20 sm:py-24">
        <SectionHeader
          eyebrow="06 / 常见问题"
          sub="关于 Better Admin 的架构选择与使用方式。"
          title="常见问题"
        />

        {/* Accordion（react-aria DisclosureGroup）：高度 + 淡入过渡，同一时间只展开一项 */}
        <Accordion className="mt-10 border-t border-border">
          {FAQ_ITEMS.map((item, index) => (
            <Accordion.Item key={item.value} id={item.value}>
              <Accordion.Heading>
                <Accordion.Trigger className="items-center gap-4 px-0 py-4">
                  <span className="font-mono text-[11px] text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1">
                    <Typography type="body-sm" weight="medium">
                      {item.title}
                    </Typography>
                  </span>
                  <Accordion.Indicator>
                    <ChevronDown />
                  </Accordion.Indicator>
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <div className="pb-4 pl-9">
                  <Typography
                    className="leading-relaxed"
                    color="muted"
                    type="body-sm"
                  >
                    {item.content}
                  </Typography>
                </div>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>

        <Typography className="mt-8" color="muted" type="body-sm">
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
        </Typography>
      </div>
    </section>
  );
}
