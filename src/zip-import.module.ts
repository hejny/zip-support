import { declareModule, patternToRegExp, string_mime_type } from '@collboard/modules-sdk';
import { Registration } from 'destroyable';
import jszip from 'jszip';
import { Vector } from 'xyzt';
import { contributors, description, license, repository, version } from '../package.json';
// TODO:!!! Cleanup unused libs

const mimeTypes: string_mime_type[] = ['application/zip', 'application/x-zip-compressed'];

declareModule({
    manifest: {
        name: '@collboard/zip-import',
        contributors,
        description,
        license,
        repository,
        version,
        flags: {
            isHidden: true /* <- TODO: (File) support modules should be always hidden*/,
        },
        supports: {
            fileImport: mimeTypes,
        },
    },
    async setup(systems) {
        const { importSystem, appState } = await systems.request('importSystem', 'appState');

        return importSystem.registerFileSupport({
            priority: 10,
            async importFile({ logger, file: zipFile, boardPosition, previewOperation, willCommitArts, next }) {
                if (!mimeTypes.some((mimeType) => patternToRegExp(mimeType).test(zipFile.type))) {
                    return next();
                }

                willCommitArts();

                const zipDoc = await jszip.loadAsync(zipFile);

                // TODO: [➰] Note: DO NOT select created arts by not returning operation
                // TODO: [➰] const result = Registration.void();

                for (const zipObject of Object.values(zipDoc.files)) {
                    if (zipObject.dir) {
                        continue;
                    }

                    const file = new File([await zipObject.async('blob')], zipObject.name);

                    logger.info(`File in zip`, { zipObject, file });

                    // TODO: [➰] const importing =  await importSystem.importFile(...
                    await importSystem.importFile({
                        file,
                        boardPosition,
                    });
                    boardPosition = boardPosition.add(new Vector(30, 30).scale(1 / appState.transform.scale.x));
                    // TODO: [➰] result.addSubdestroyable(importing);
                }

                return Registration.void();
                // TODO: [➰] return real result from importFile;
            },
        });
    },
});
