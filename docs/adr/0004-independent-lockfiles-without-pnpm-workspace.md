# 各应用独立 lockfile，不引入 pnpm workspace

仓库根目录不放 `pnpm-workspace.yaml`，每个 `apps/*` 各自维护 `pnpm-lock.yaml` 并独立安装、构建、部署；`apps/*/pnpm-workspace.yaml` 仅承载 pnpm 设置（allowBuilds / overrides / 供应链策略），不构成 workspace 依赖提升。子目录要能单独作为部署根，依赖解析不能被其他应用牵动；代价是根目录无法一次装齐依赖，升级也要逐应用执行。
