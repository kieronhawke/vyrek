import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { media } from "sanity-plugin-media";
import { apiVersion, dataset, projectId } from "./env";
import { schemaTypes } from "./schemas";

export default defineConfig({
  name: "vyrek",
  title: "Vyrek",
  basePath: "/studio",
  projectId,
  dataset,
  schema: { types: schemaTypes },
  plugins: [
    structureTool(),
    visionTool({ defaultApiVersion: apiVersion }),
    media(),
  ],
});
