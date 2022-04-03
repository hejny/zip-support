import { loadAndRunExternalScript, string_data_url } from '@collboard/modules-sdk';

export async function pdfToImages(pdfUrl: string_data_url): Promise<string_data_url[]> {
    // Note: I can not figure out how to install this library via NPM
    //       TODO: Probbably put it into module assets to not rely on CDN
    //       TODO: loadAndRunExternalScriptOnce
    //       TODO: Put security checksum to script loading
    //       For pdf.min.js manual @see https://usefulangle.com/post/20/pdfjs-tutorial-1-preview-pdf-during-upload-wih-next-prev-buttons
    await loadAndRunExternalScript(`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.2.228/pdf.min.js`);

    const pdfjsLib = (window as any).pdfjsLib;
    const pdfDocument = await pdfjsLib.getDocument({ url: pdfUrl });

    const images: string_data_url[] = [];
    for (
        let pageNumber = 1 /* Note: Ordering in this library starts from 1 */;
        pageNumber <= pdfDocument.numPages;
        pageNumber++
    ) {
        const page = await pdfDocument.getPage(pageNumber);

        const canvas = document.createElement('canvas');
        const ration = 1;
        const { width, height } = page.getViewport(ration);
        canvas.width = width;
        canvas.height = height;

        const viewport = page.getViewport(ration);

        await page.render({
            canvasContext: canvas.getContext('2d'),
            viewport,
        });

        images.push(canvas.toDataURL('image/png'));
    }

    return images;
}
