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

        {/* Accordion（react-aria DisclosureGroup）：使用官方默认解剖与间距 */}
        <Accordion className="mt-10">
          {FAQ_ITEMS.map((item, index) => (
            <Accordion.Item key={item.value} id={item.value}>
              <Accordion.Heading>
                <Accordion.Trigger>
                  <span className="flex flex-1 items-center gap-4">
                    <span className="font-mono text-[11px] text-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
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
                <Accordion.Body>{item.content}</Accordion.Body>
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
