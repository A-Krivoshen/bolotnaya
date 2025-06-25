import { defineConfig } from "tinacms";

const branch = process.env.TINA_BRANCH || "main";

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
      mediaRoot: "static/images",
      publicFolder: "static",
    },
  },
  schema: {
    collections: [
      {
        name: "posts_ru",
        label: "Статьи (Русский)",
        path: "content/ru/posts",
        format: "md",
        fields: [
          { type: "string", name: "title", label: "Заголовок", isTitle: true, required: true },
          { type: "datetime", name: "date", label: "Дата", required: true },
          { type: "string", name: "tags", label: "Теги", list: true, default: ["якиманка"] },
          { type: "rich-text", name: "body", label: "Текст", isBody: true },
        ],
      },
      {
        name: "posts_en",
        label: "Posts (English)",
        path: "content/en/posts",
        format: "md",
        fields: [
          { type: "string", name: "title", label: "Title", isTitle: true, required: true },
          { type: "datetime", name: "date", label: "Date", required: true },
          { type: "string", name: "tags", label: "Tags", list: true, default: ["yakimanka"] },
          { type: "rich-text", name: "body", label: "Body", isBody: true },
        ],
      },
      {
        name: "cameras_ru",
        label: "Камеры (Русский)",
        path: "content/ru/cameras",
        format: "md",
        fields: [
          { type: "string", name: "title", label: "Заголовок", isTitle: true, required: true },
          { type: "datetime", name: "date", label: "Дата", required: true },
          { type: "string", name: "description", label: "Описание" },
          { type: "string", name: "id", label: "ID камеры", required: true },
          { type: "string", name: "hls_url", label: "HLS URL", required: true },
        ],
      },
      {
        name: "cameras_en",
        label: "Cameras (English)",
        path: "content/en/cameras",
        format: "md",
        fields: [
          { type: "string", name: "title", label: "Title", isTitle: true, required: true },
          { type: "datetime", name: "date", label: "Date", required: true },
          { type: "string", name: "description", label: "Description" },
          { type: "string", name: "id", label: "Camera ID", required: true },
          { type: "string", name: "hls_url", label: "HLS URL", required: true },
        ],
      },
      {
        name: "photos_ru",
        label: "Фото (Русский)",
        path: "content/ru/photos",
        format: "md",
        fields: [
          { type: "string", name: "title", label: "Заголовок", isTitle: true, required: true },
          { type: "datetime", name: "date", label: "Дата", required: true },
          { type: "image", name: "images", label: "Изображения", list: true },
        ],
      },
      {
        name: "photos_en",
        label: "Photos (English)",
        path: "content/en/photos",
        format: "md",
        fields: [
          { type: "string", name: "title", label: "Title", isTitle: true, required: true },
          { type: "datetime", name: "date", label: "Date", required: true },
          { type: "image", name: "images", label: "Images", list: true },
        ],
      },
      {
        name: "history_ru",
        label: "История (Русский)",
        path: "content/ru/history",
        format: "md",
        fields: [
          { type: "string", name: "title", label: "Заголовок", isTitle: true, required: true },
          { type: "datetime", name: "date", label: "Дата", required: true },
          { type: "rich-text", name: "body", label: "Текст", isBody: true },
        ],
      },
      {
        name: "history_en",
        label: "History (English)",
        path: "content/en/history",
        format: "md",
        fields: [
          { type: "string", name: "title", label: "Title", isTitle: true, required: true },
          { type: "datetime", name: "date", label: "Date", required: true },
          { type: "rich-text", name: "body", label: "Body", isBody: true },
        ],
      },
    ],
  },
});