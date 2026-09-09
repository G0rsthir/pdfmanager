/**
 * What opening a file from a library listing should do
 */
export type FileClickAction = "reader" | "details";

export const DEFAULT_FILE_CLICK_ACTION: FileClickAction = "details";

export type LibraryLayout = "grid" | "table";

export const DEFAULT_LIBRARY_LAYOUT: LibraryLayout = "table";
