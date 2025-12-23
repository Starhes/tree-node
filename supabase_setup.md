# Supabase 设置指南

要启用分享功能，您需要创建一个免费的 Supabase 项目。

1.  **创建项目**: 访问 [supabase.com](https://supabase.com)，注册/登录，然后创建一个新项目 (New Project)。
2.  **获取凭证**:
    -   进入 **Project Settings (设置)** -> **API**。
    -   复制 `Project URL`。
    -   复制 `anon` / `public` key。
    -   在你的项目根目录下创建一个名为 `.env` 的文件 (`d:\code\tree\.env`) 并添加以下内容：
        ```env
        VITE_SUPABASE_URL=你的项目URL
        VITE_SUPABASE_ANON_KEY=你的anon_key
        ```

3.  **SQL 编辑器**: 点击侧边栏的 **SQL Editor**，粘贴下面的 SQL 代码，然后点击 **Run**。这将设置数据库、存储桶和安全策略。

```sql
-- 1. 创建用于存储树配置的表 (使用 UUID)
create table public.trees (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  image_path text not null, -- 存储桶中的文件路径
  colors jsonb not null,    -- 颜色配置 { primary, accent, light }
  created_by uuid default auth.uid() -- 可选: 如果使用 Auth，记录创建者
);

-- 2. 创建用于存照片的公开存储桶
insert into storage.buckets (id, name, public) values ('tree-photos', 'tree-photos', true);

-- 3. 安全策略 (RLS - 行级安全)

-- 启用 RLS
alter table public.trees enable row level security;

-- 策略: 任何人都可以查看树数据 (用于查看分享)
create policy "Public trees are viewable by everyone"
  on public.trees for select
  using ( true );

-- 策略: 任何人都可以上传一个树 (匿名上传)
create policy "Anyone can upload a tree"
  on public.trees for insert
  with check ( true );

-- 存储策略
-- 允许公开读取存储桶
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'tree-photos' );

-- 允许任何人上传图片
create policy "Public Upload"
  on storage.objects for insert
  with check ( bucket_id = 'tree-photos' );
```

4.  **身份验证**: 进入 **Authentication** -> **Providers**，确保 "Email" 是启用的（默认通常是启用的）。我们目前允许公开匿名上传，所以不需要额外配置，但保持开启以备后用。

完成！App 现在将连接到这个后端。
