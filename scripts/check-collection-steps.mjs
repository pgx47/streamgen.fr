import { pathToFileURL } from 'node:url';
export function failedCollectors(steps) {
  return Object.entries(steps)
    .filter(([id, step]) => (id === 'collect' || id.startsWith('collect_')) && step.outcome !== 'success')
    .map(([id]) => id);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const failed = failedCollectors(JSON.parse(process.env.COLLECTION_STEPS || '{}'));
  if (failed.length) {
    console.error('::error::Collecte partielle : ' + failed.join(', ') + '. Les données validées ont été conservées ; consulter les rapports par source.');
    process.exitCode = 1;
  } else console.log('Tous les collecteurs ont terminé sans erreur de processus. Consulter les rapports pour les erreurs par source.');
}
