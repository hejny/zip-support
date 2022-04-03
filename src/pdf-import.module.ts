import {
    blobToDataUrl,
    centerArts,
    dataUrlToBlob,
    declareModule,
    fitInside,
    ImageArt,
    measureImageSize,
    ShapeArt,
    ShapeName,
} from '@collboard/modules-sdk';
import { Registration } from 'destroyable';
import { Vector } from 'xyzt';
import { contributors, description, license, repository, version } from '../package.json';
import { pdfToImages } from './pdfToImages';

declareModule({
    manifest: {
        name: '@collboard/pdf-import',
        contributors,
        description,
        license,
        repository,
        version,
        flags: {
            isHidden: true /* <- TODO: (File) support modules should be always hidden*/,
        },
        supports: {
            fileImport: 'application/pdf',
        },
    },
    async setup(systems) {
        const { importSystem, apiClient, appState, materialArtVersioningSystem } = await systems.request(
            'importSystem',

            'apiClient',
            'appState',
            'materialArtVersioningSystem',
        );

        return importSystem.registerFileSupport({
            priority: 10,
            async processFile({ logger, file, boardPosition, previewOperation, willCommitArts, next }) {
                if (file.type !== 'application/pdf') {
                    return next();
                }

                willCommitArts();

                const pdfFile = file;

                const pdfDataUrl = await blobToDataUrl(pdfFile);
                const imagesDataUrl = await pdfToImages(pdfDataUrl);

                // Note: DO NOT select created arts by not returning operation
                const result = Registration.void();

                for (const [i, imageDataUrl] of imagesDataUrl.entries()) {
                    const imageArt = new ImageArt(
                        imageDataUrl,
                        `Page ${i + 1}/${imagesDataUrl.length} of ${pdfFile.name}`,
                    );
                    imageArt.size = fitInside({
                        isUpscaling: false,
                        objectSize: await (await measureImageSize(imageDataUrl)).divide(appState.transform.scale),
                        containerSize: appState.windowSize.divide(appState.transform.scale),
                    });
                    imageArt.opacity = 0.5;
                    imageArt.locked = true;

                    const borderArt = new ShapeArt(
                        ShapeName.Rectange,
                        '#ccc',
                        3 / appState.transform.scale.x,
                        imageArt.shift,
                        imageArt.size,
                    );
                    // TODO: Maybe borderArt.opacity= 0.9;
                    borderArt.locked = true;

                    centerArts({
                        arts: [imageArt, borderArt],
                        boardPosition,
                    });

                    logger.info(`Page ${i + 1}/${imagesDataUrl.length}`, imageArt);

                    boardPosition = boardPosition
                        .add(new Vector(imageArt.size).rearrangeAxis(([x, y, z]) => [0, y, 0]))
                        .add(new Vector(0, 30).scale(1 / appState.transform.scale.x));

                    previewOperation.update(imageArt /* TODO: Also borderArt */);

                    const imageSrc = await apiClient.fileUpload(await dataUrlToBlob(imageDataUrl));
                    imageArt.src = imageSrc;
                    imageArt.opacity = 1;

                    const operation = materialArtVersioningSystem
                        .createPrimaryOperation()
                        .newArts(imageArt, borderArt)
                        .persist();
                    result.addSubdestroyable(operation);
                }

                return result;
            },
        });
    },
});

/**
 * TODO: Do not make border by ShapeArt but make some better ImageArt
 * TODO: Better tooling around PDFs
 * TODO: Maybe create PdfArt
 */
