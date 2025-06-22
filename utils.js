/**
 * @param {File} file
 */
export function download (file) {
  const href = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = href;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(href);
  a.remove();
}