export const getJsonData = <T>(id: string): T => {
  const element = document.getElementById(id);
  if (!element?.textContent) {
    throw new Error(`Missing JSON data element: #${id}`);
  }
  return JSON.parse(element.textContent) as T;
};

export const requiredElement = <T extends Element>(selector: string, rootNode: ParentNode = document): T => {
  const element = rootNode.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element;
};

export const requiredElementById = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: #${id}`);
  }
  return element as T;
};
