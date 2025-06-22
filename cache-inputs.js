
export function cacheInputs (cacheKey, inputElements) {
  const values = {};
  for (const element of inputElements) {
    if (element?.value) values[element.id] = element.value;
  }
  localStorage.setItem(cacheKey, JSON.stringify(values));
}

export function restoreInputs (cacheKey) {
  const values = JSON.parse(localStorage.getItem(cacheKey));
  if (!values) return;
  for (const [id, value] of Object.entries(values)) {
    const elem = document.getElementById(id);
    if (elem) elem.value = value;
  }
}
