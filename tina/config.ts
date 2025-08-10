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
      // можно задать подсказки по умолчанию
      // options: ["bolotnaya-square"]
    },
  },
];

export default defineConfig({
  branch,
  clientId: process.env.TINA_CLIENT_ID,
  token: process.env.TINA_TOKEN,

  build: {
    outputFolder: "public",
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

      // ===== Камеры =====
      {
        label: "Камеры",
        name: "camera",
        path: "content/cameras",
        format: "md",
        fields: [
          { type: "string", name: "name", label: "Название", required: true },
          { type: "string", name: "stream_url", label: "Ссылка на поток", required: true },
          { type: "image", name: "image", label: "Превью/логотип" },
          { type: "string", name: "description", label: "Описание" },
        ],
      },
    ],
  },
});
