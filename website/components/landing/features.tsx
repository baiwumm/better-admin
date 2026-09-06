import { FileJson, Layers, ShieldCheck } from "lucide-react";

const FEATURES = [
  {
    icon: Layers,
    title: "多技术栈同构",
    description:
      "同一套产品、同一套 UI、同一套业务逻辑、同一套数据库，React、Vue、Next.js、Nuxt、NestJS 五端独立实现、独立部署。",
  },
  {
    icon: FileJson,
    title: "OpenAPI Contract 优先",
    description:
      "API 设计先定义 Contract 再实现，OpenAPI 是唯一事实来源；数据库 Schema、数据模型、业务规则五项跨栈一致。",
  },
  {
    icon: ShieldCheck,
    title: "RBAC 权限模型",
    description:
      "用户 ↔ 角色 ↔ 权限位掩码，菜单与权限关联控制；服务端强制校验 API 权限，前端路由守卫只是体验层。",
  },
];

export function Features() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight">
            设计先行，一致性是硬性规则
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
            不允许为了实现方便而破坏架构约定，所有技术栈遵循同一份规范。
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-dashed p-6 shadow-none transition-colors hover:bg-muted/50"
            >
              <feature.icon
                size={20}
                className="text-foreground"
                strokeWidth={1.75}
              />
              <h3 className="mt-4 font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
