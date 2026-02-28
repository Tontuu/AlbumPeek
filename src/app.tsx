async function waitUntil<T>(
    predicate: () => T | null | undefined,
    sourceName: string,
    interval = 100,
    timeout = 5000
): Promise<T> {
    const start = Date.now();
    let result;
    while ((result = predicate()) == null) {
        if (Date.now() - start > timeout) {
            throw new Error(`[APEEK]: ${sourceName} timeout`)
        }
        await new Promise(r => setTimeout(r, interval));
    }
    console.log("[APEEK]: ", sourceName, "loaded");
    return result;
}

async function displayAlbumName() {
    const queue = Spicetify.Queue
    const albumName = queue.track.contextTrack.metadata.album_title

    const albumNameElement = await createAlbumNameElement(albumName);
    const selector = localStorage.getItem('position');
    console.log("[APEEK]: Looking for Selector: ", selector);
    if (!selector) return;

    const container = await waitForElement(selector);
    console.log("[APEEK]: TargetContainer Found: ", !!container);

    if (container) {
        container.appendChild(albumNameElement);
        console.log('[APEEK] Release date element appended to:', container.className);
    }
}

async function updateAlbumDisplay() {
    removeExistingAlbumNameElement();
    await displayAlbumName();
}

function removeExistingAlbumNameElement() {
    removeElementById("albumName");
}

function removeElementById(id: string) {
    console.log("[APEEK-TEST]: Searching for element to remove: ", id);
    const element = document.getElementById(id);
    if (element) {
        console.log("[APEEK-TEST]: Element found: ", element);
        element.remove();
    }
}

async function createAlbumNameElement(albumName) {
    // AlbumName Element
    console.log("[APEEK-TEST]: creating albumName Element")
    const container = createDivElement('albumName');

    // Bullet
    const bullet = document.createElement("span");
    bullet.textContent = '• ';
    container.appendChild(bullet)

    // Album URI
    const albumURI = Spicetify.Player.data.item.album.uri;
    const albumNameElement = createAnchorElement(albumName, albumURI);
    container.appendChild(albumNameElement);

    await applyStylesFromSelector(container)

    return container;
}

function createDivElement(id) {
    const divElement = document.createElement("div");
    divElement.id = id;
    return divElement;
}

function createAnchorElement(textContent, uri) {
    const anchorElement = document.createElement(uri ? "a" : "span");
    anchorElement.textContent = textContent;

    if (uri) {
        anchorElement.href = uri;
        anchorElement.style.cursor = 'pointer';
    }
    return anchorElement;
}

async function applyStylesFromSelector(albumNameElement) {
    const selector = localStorage.getItem("position");
    if (!selector) return;
    console.log("[APEEK-TEST]: selector found: ", selector);

    const targetedElement = await waitForElement(`${selector} a`);
    console.log("[APEEK-TEST]: targeted Element found: ", targetedElement.textContent);


    const targetedStyles = window.getComputedStyle(targetedElement);
    console.log("[APEEK-TEST]: Set style for element")
    setElementStyles(albumNameElement, targetedStyles);
}


function setElementStyles(element, styles) {
    element.style.fontSize = styles.fontSize;
    element.style.fontWeight = styles.fontWeight;
    element.style.minWidth = "75px";
}

function albumNameCSS() {
    const albumNameStyle = document.createElement('style');
    albumNameStyle.innerHTML = `
        #albumName a, #albumName p {
            color: var(--text-subdued);
        }
    `;

    return albumNameStyle;
}

async function waitForElement(selector: string, timeout = 5000): Promise<Element> {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(selector);
        if (existing) return resolve(existing);

        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element)
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error("Timeout waiting for element"));
        }, timeout);
    });
}


async function main() {
  try {
      await waitUntil(() => Spicetify?.showNotification, "Spicetify");
      await waitUntil(() => Spicetify.Player?.data?.item, "Audio Data")

      Spicetify.Player.addEventListener("songchange", debounce(updateAlbumDisplay, 150));

      await updateAlbumDisplay();

      document.head.appendChild(albumNameCSS());
  } catch(e) {
      console.error("[APEEK]: Error displaying album Name: ", e);
  }
  
}

function debounce(fn: Function, delay: number) {
    let timer: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay)
    };
}

export default main;
