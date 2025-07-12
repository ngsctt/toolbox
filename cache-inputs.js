
export function cacheInputs (cacheKey, inputElements) {
  const values = {};
  for (const element of inputElements) {
    if (!element) continue;
    else if (element instanceof HTMLImageElement) values[element.id] = element.src;
    else if (element?.type === 'checkbox') values[element.id] = element.checked;
    else if (element?.value != undefined) values[element.id] = element.value;
  }
  localStorage.setItem(cacheKey, JSON.stringify(values));
}

export function restoreInputs (cacheKey) {
  const values = JSON.parse(localStorage.getItem(cacheKey));
  if (!values) return;
  for (const [id, value] of Object.entries(values)) {
    const element = document.getElementById(id);
    if (!element) continue;
    else if (element instanceof HTMLImageElement) element.src = value;
    else if (element.type === 'checkbox') element.checked = value;
    else element.value = value;
  }
}
