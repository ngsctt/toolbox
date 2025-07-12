const indentationXSLT = new DOMParser().parseFromString([
  '<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
  '  <xsl:strip-space elements="*" />',
  '  <xsl:template match="node()|@*">',
  '    <xsl:copy>',
  '      <xsl:apply-templates select="node()|@*" />',
  '    </xsl:copy>',
  '  </xsl:template>',
  '  <xsl:output indent="yes" />',
  '</xsl:stylesheet>',
].join('\n'), 'application/xml');

const xsltProcessor = new XSLTProcessor();    
xsltProcessor.importStylesheet(indentationXSLT);

const serialiseXML = node => {
  const indented = xsltProcessor.transformToDocument(node);
  return new XMLSerializer().serializeToString(indented);
}

class Data {
  constructor (value) {
    this.value = value
  }

  toString () {
    return this.value;
  }
}

export function imageConverter (imageFile) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const objURL = URL.createObjectURL(imageFile);
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      if (img.width <= 400 && img.height <= 400) {
        canvas.width = img.width;
        canvas.height = img.height;
      } else {
        canvas.width = ratio >= 1 ? 400 : 400 * ratio;
        canvas.height = ratio <= 1 ? 400 : 400 / ratio;
      }
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataURL = canvas.toDataURL('image/png', 1)
      // resolve(dataURL?.replace('data:image/png;base64,', ''));
      resolve(dataURL);
    }
    img.src = objURL;
  })
}

function convertToPlist (doc, value) {
  if (typeof value === 'number') {
    const e = doc.createElement('integer');
    e.textContent = value;
    return e;
  }

  else if (typeof value === 'string') {
    const e = doc.createElement('string');
    e.textContent = value;
    return e;
  }

  else if (typeof value === 'boolean') {
    if (value === true) return doc.createElement('true');
    else if (value === false) return doc.createElement('true');
    else throw new Error("Invalid boolean");
  }

  else if (typeof value === 'object') {
    if (Array.isArray(value)) {
      const e = doc.createElement('array');
      e.append(...value.map(v => convertToPlist(doc, v)))
      return e;
    }

    else if (value instanceof Data) {
      const e = doc.createElement('data');
      e.textContent = value.toString();
      return e;
    }

    else if (value && [undefined, Object].includes(value.constructor)) {
      const e = doc.createElement('dict');
      const entries = Object.entries(value);
      for (const [k, v] of entries) {
        if (v == null) continue;
        const key = doc.createElement('key');
        key.textContent = k;
        e.append(key, convertToPlist(doc, v));
      }
      return e;
    }

    else throw new Error(`Unknown object instance`);
  } else throw new Error(`Unknown type: "${typeof value}"`);
}

export async function newWebClip (options) {
  if (!options) throw new Error("Must provide options");
  if (!options.profile_id) throw new Error("Must provide profile identifier");
  if (!options.url) throw new Error("Must provide URL");
  if (!options.label) throw new Error("Must provide Web Clip label");
  const icon = options.icon ? await imageConverter(options.icon) : null;
  const url = new URL(options.url);
  const webclip_uuid = crypto.randomUUID();
  const profile_uuid = crypto.randomUUID();

  const root = {
    PayloadContent: [
      {
        FullScreen: options.fullscreen ?? false,
        Icon: icon ? new Data(icon) : null,
        IgnoreManifestScope: options.ignore_scope ?? false,
        IsRemovable: options.removeable ?? true,
        Label: options.label,
        PayloadDescription: 'Configures settings for a web clip',
        PayloadDisplayName: 'Web Clip',  
        PayloadIdentifier: 'com.apple.webClip.managed.' + webclip_uuid,
        PayloadType: 'com.apple.webClip.managed',
        PayloadUUID: webclip_uuid,
        PayloadVersion: 1,
        Precomposed: false,
        URL: url.href
      }
    ],
    PayloadDescription: options.desc,
    PayloadDisplayName: options.profile_name,
    PayloadIdentifier: options.profile_id,
    PayloadRemovalDisallowed: false,
    PayloadType: 'Configuration',
    PayloadUUID: profile_uuid,
    PayloadVersion: 1
  }

  const plistDT = document.implementation.createDocumentType('plist', '-//Apple//DTD PLIST 1.0//EN', 'http://www.apple.com/DTDs/PropertyList-1.0.dtd')
  const plist = document.implementation.createDocument(null, 'plist', plistDT);
  plist.insertBefore(plist.createProcessingInstruction('xml', 'version="1.0" encoding="UTF-8"'), plist.firstChild);
  plist.documentElement.setAttribute('version', '1.0');
  plist.documentElement.append(convertToPlist(plist, root));

  const filename = (options.profile_name ?? `${url.origin}-web-clip`).replace(/[^-\p{L}]{1,}/gu,'-').replace(/-{2,}/,'-') + '.mobileconfig';

  const xml = serialiseXML(plist);
  // console.log(xml);
  const profile = new File([xml], filename, { type: 'application/x-apple-aspen-config' });
  return profile;
}
