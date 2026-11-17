export function getFileIconClass(
  fileName: string,
  isDirectory = false,
): string {
  const lower = fileName.toLowerCase();
  const ext = lower.split(".").pop() ?? "";

  if (isDirectory) {
    switch (lower) {
      case "public":
        return "folder_type_public";
      case "css":
        return "folder_type_css";
      case "js":
        return "folder_type_js";
      case "img":
        return "folder_type_images";
      case "models":
        return "folder_type_model";
      case "views":
        return "folder_type_view";
      case "controllers":
        return "folder_type_controller";
      case "templates":
        return "folder_type_template";
      default:
        return "folder-icon";
    }
  }

  switch (lower) {
    case "favicon.ico":
      return "file_type_favicon";
    case "package.json":
      return "file_type_npm";
    case "license":
    case "license.txt":
      return "file_type_license";
  }

  switch (ext) {
    case "html":
    case "htm":
      return "file_type_html";
    case "js":
      return "file_type_js";
    case "css":
      return "file_type_css";
    case "json":
      return "file_type_json";
    case "gif":
    case "jpg":
    case "jpeg":
    case "png":
      return "file_type_image";
    case "md":
      return "file_type_markdown";
    case "java":
      return "file_type_java";
    default:
      return "file_type_text";
  }
}
