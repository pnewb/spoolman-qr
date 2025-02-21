const PAPER_SIZES = { a4: [210, 297], letter: [215.9, 279.4], '4x6': [101, 151] }
window.SharedArrayBuffer = class SharedArrayBuffer {};

const getData = (format, id, origin) => {
    switch(format) {
        case 'full-url':
        case 'partial-url':
            return `${((format == 'full-url' && origin) || '').replace(/\/+$/, '')}/spool/show/${id}`;
        case 'official':
            return `web+spoolman:s-${id}`;
        default:
            throw new Error('invalid format')
    }
}

const generateButton = document.getElementById('generate-button');

const doGenerate = async (paper, start, codesPerRow, margin, padding, format, origin) => {
    generateButton.disabled = true;
    let [WIDTH, HEIGHT] = PAPER_SIZES[paper].map(v => v * 10 /* 10px/mm = 254dpi */);

    const quietZone = 1 + padding / 100;
    const maxWidth = Math.floor(WIDTH / codesPerRow) * codesPerRow - WIDTH * margin / 100;
    const qrSize = Math.floor(maxWidth / codesPerRow);
    const rows = Math.floor((HEIGHT * (1 - margin / 100)) / qrSize);
    const maxHeight = rows * qrSize;

    const generatorContainer = document.createElement('generator');
    const qr = new QRCode(generatorContainer, {
        text: document.location.href,
        width: Math.floor(qrSize * (1 / quietZone) - 2),
        height: Math.floor(qrSize * (1 / quietZone) - 2),
        correctLevel: QRCode.CorrectLevel.L
    });

    const margins = [WIDTH - maxWidth, HEIGHT - maxHeight];
    const canvas = new ImageScript.Image(WIDTH, HEIGHT);
    canvas.fill(0xffffffff);

    let n = parseInt(start);
    for(let row = 0; row < rows; row++) {
        for(let col = 0; col < codesPerRow; col++) {
            const qrCanvas = new ImageScript.Image(qrSize, qrSize);
            qrCanvas.fill(0xff);
            qrCanvas.drawBox(2, 2, qrSize - 2, qrSize - 2, 0xffffffff);

            qr.makeCode(getData(format, n++, origin));

            const codeCanvas = generatorContainer.children[0];
            const [codeWidth, codeHeight] = [codeCanvas.width, codeCanvas.height];
            const codePixels = codeCanvas.getContext('2d').getImageData(0, 0, codeWidth, codeHeight).data;

            const qrImg = new ImageScript.Image(codeWidth, codeHeight);
            for(let i = 0; i < qrImg.__view__.byteLength; i++)
                qrImg.__view__.setUint8(i, codePixels[i]);

            qrCanvas.composite(qrImg, (qrCanvas.width - qrImg.width) / 2, (qrCanvas.height - qrImg.height) / 2);
            canvas.composite(
                qrCanvas,
                Math.floor(margins[0] / 2 + col * qrSize),
                Math.floor(margins[1] / 2 + row * qrSize)
            )
        }
    }

    document.getElementById('end').value = n - 1;
    document.getElementById('size').value = `${Math.round(qrSize / 10)}mm x ${Math.round(qrSize / 10)}mm`
    generatorContainer.remove();
    generateButton.disabled = false;

    const result = await canvas.encode();
    const blob = new Blob([result], { type: 'image/png' });
    const imgElement = document.getElementById('output');
    if(imgElement.src)
        URL.revokeObjectURL(imgElement.src);
    imgElement.src = URL.createObjectURL(blob);
}

function generate(event) {
    if(event)
        event.preventDefault();

    const paper = document.getElementById('paper').value;
    const start = document.getElementById('start').value;
    const perRow = document.getElementById('row-length').value;
    const margin = document.getElementById('margin').value;
    const padding = document.getElementById('padding').value;
    const format = document.getElementById('format').value;
    const origin = document.getElementById('origin').value;
    doGenerate(paper, start, perRow, margin, padding, format, origin);

    return false;
}
