import { defineConfig } from "tinacms";

const branch = process.env.TINA_BRANCH || "main";

// Общие поля для галерей
const galleryFields = [
  { type: "string", name: "slug", label: "Slug (латиница, -)", required: true },
  { type: "string", name: "title", label: "Заголовок / Title", required: true },
  { type: "string", name: "description", label: "Описание / Description" },
  {
    type: "object",
    name: "images",
    label: "Изображения / Images",
    list: true,
    fields: [
      { type: "image", name: "src", label: "Картинка", required: true },
      { type: "string", name: "caption", label: "Подпись / Caption" },
    ],
  },
];

// Общие поля для Истории (ссылка на галерею по slug)
const historyFields = [
  { type: "string", name: "slug", label: "Slug записи (латиница, -)", required: true },
  { type: "string", name: "title", label: "Заголовок / Title", required: true },
  { type: "string", name: "description", label: "Краткое описание / Summary" },
  {
    type: "string",
    name: "gallery_slug",
    label: "Slug галереи (из Galleries)",
    required: true,
    ui: {
      description:
        "Укажи slug существующей галереи (одинаковый для RU/EN), например: bolotnaya-square",
    },
  },
];

export default defineConfig({
  branch,
  clientId: process.env.TINA_CLIENT_ID,
  token: process.env.TINA_TOKEN,

  build: {
    // кладём админку в static/admin (корректно для Hugo)
    outputFolder: "admin",
    publicFolder: "static",
  },

  media: {
    tina: {
      publicFolder: "static",
      mediaRoot: "images/galleries",
    },
  },

  schema: {
    collections: [
      // ===== RU posts =====
      {
        label: "Посты (Русский)",
        name: "ru_post",
        path: "content/ru/posts",
        format: "md",
        fields: [
          { type: "string", name: "title", label: "Заголовок", required: true },
          { type: "datetime", name: "date", label: "Дата", required: true },
          { type: "string", name: "tags", label: "Теги", list: true },
          { type: "rich-text", name: "body", label: "Текст", isBody: true },
        ],
      },

      // ===== EN posts =====
      {
        label: "Posts (English)",
        name: "en_post",
        path: "content/en/posts",
        format: "md",
        fields: [
          { type: "string", name: "title", label: "Title", required: true },
          { type: "datetime", name: "date", label: "Date", required: true },
          { type: "string", name: "tags", label: "Tags", list: true },
          { type: "rich-text", name: "body", label: "Content", isBody: true },
        ],
      },

      // ===== Галереи RU =====
      {
        label: "Галереи (RU)",
        name: "ru_gallery",
        path: "content/ru/galleries",
        format: "md",
        ui: {
          filename: { slugify: (values) => values?.slug || "" },
          defaultItem: () => ({ slug: "", title: "", description: "", images: [] }),
        },
        fields: galleryFields,
      },

      // ===== Galleries EN =====
      {
        label: "Galleries (EN)",
        name: "en_gallery",
        path: "content/en/galleries",
        format: "md",
        ui: {
          filename: { slugify: (values) => values?.slug || "" },
          defaultItem: () => ({ slug: "", title: "", description: "", images: [] }),
        },
        fields: galleryFields,
      },

      // ===== История RU =====
      {
        label: "История (RU)",
        name: "ru_history",
        path: "content/ru/history",
        format: "md",
        ui: {
          filename: { slugify: (values) => values?.slug || "" },
          defaultItem: () => ({ slug: "", title: "", description: "", gallery_slug: "" }),
        },
        fields: historyFields,
      },

      // ===== History EN =====
      {
        label: "History (EN)",
        name: "en_history",
        path: "content/en/history",
        format: "md",
        ui: {
          filename: { slugify: (values) => values?.slug || "" },
          defaultItem: () => ({ slug: "", title: "", description: "", gallery_slug: "" }),
        },
        fields: historyFields,
      },

      // ===== CAMERAS RU: content/ru/cameras/<slug>/index.md =====
      {
        label: "Камеры (RU)",
        name: "ru_camera",
        path: "content/ru/cameras",
        format: "md",
        match: { include: "**/index" }, // работаем с папками
        ui: {
          router: ({ document }) =>
            `/ru/cameras/${document._sys.relativePath.replace(/\/index\.md$/, "")}/`,
          filename: {
            slugify: (values) =>
              (values?.title || "camera")
                .toString()
                .trim()
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9\-]+/g, ""),
          },
          defaultItem: () => ({
            title: "",
            description: "",
            stream_url: "",
            streams: [],
          }),
        },
        fields: [
          { type: "string", name: "title", label: "Заголовок", required: true, isTitle: true },
          { type: "string", name: "description", label: "Описание" },
          { type: "image",  name: "image", label: "Превью (опц.)" },
          { type: "string", name: "stream_url", label: "HLS URL (фолбэк)" },

          {
            type: "object",
            name: "streams",
            label: "Ракурсы (streams)",
            list: true,
            ui: {
              itemProps: (item?: any) => ({
                label: item?.title || item?.id || item?.url || "stream",
              }),
            },
            fields: [
              { type: "string", name: "id",    label: "ID (напр. camera1)" },
              { type: "string", name: "title", label: "Название на кнопке" },
              { type: "string", name: "url",   label: "HLS URL (.m3u8)", required: true },
            ],
          },

          { type: "rich-text", name: "body", label: "Текст (опц.)" },
        ],
      },

      // ===== CAMERAS EN: content/en/cameras/<slug>/index.md =====
      {
        label: "Cameras (EN)",
        name: "en_camera",
        path: "content/en/cameras",
        format: "md",
        match: { include: "**/index" },
        ui: {
          router: ({ document }) =>
            `/en/cameras/${document._sys.relativePath.replace(/\/index\.md$/, "")}/`,
          filename: {
            slugify: (values) =>
              (values?.title || "camera")
                .toString()
                .trim()
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9\-]+/g, ""),
          },
          defaultItem: () => ({
            title: "",
            description: "",
            stream_url: "",
            streams: [],
          }),
        },
        fields: [
          { type: "string", name: "title", label: "Title", required: true, isTitle: true },
          { type: "string", name: "description", label: "Description" },
          { type: "image",  name: "image", label: "Preview (opt.)" },
          { type: "string", name: "stream_url", label: "HLS URL (fallback)" },

          {
            type: "object",
            name: "streams",
            label: "Streams",
            list: true,
            ui: {
              itemProps: (item?: any) => ({
                label: item?.title || item?.id || item?.url || "stream",
              }),
            },
            fields: [
              { type: "string", name: "id",    label: "ID (e.g. camera1)" },
              { type: "string", name: "title", label: "Button title" },
              { type: "string", name: "url",   label: "HLS URL (.m3u8)", required: true },
            ],
          },

          { type: "rich-text", name: "body", label: "Body (opt.)" },
        ],
      },

      // ⚠️ Старую коллекцию "Камеры" (path: content/cameras) удалил —
      // мы теперь работаем с RU/EN в виде папок. Если нужен бэкап — скажи.
    ],
  },
});
