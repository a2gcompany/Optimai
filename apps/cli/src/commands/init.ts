import chalk from 'chalk';
import { isInitialized, initializeOptimaiDir, OPTIMAI_DIR } from '../lib/storage.js';

export async function initCommand(): Promise<void> {
  console.log(chalk.cyan('\n  Inicializando Optimai...\n'));

  if (isInitialized()) {
    console.log(chalk.yellow('  ⚠️  Optimai ya está inicializado en:'));
    console.log(chalk.dim(`     ${OPTIMAI_DIR}\n`));
    return;
  }

  try {
    initializeOptimaiDir();
    console.log(chalk.green('  ✓ Directorio creado:'), chalk.dim(OPTIMAI_DIR));
    console.log(chalk.green('  ✓ Archivo de tareas:'), chalk.dim('tasks/tasks.json'));
    console.log(chalk.green('  ✓ Archivo de transacciones:'), chalk.dim('finance/transactions.json'));
    console.log(chalk.green('  ✓ Configuración:'), chalk.dim('config.json'));
    console.log();
    console.log(chalk.cyan('  Ejecuta'), chalk.bold('optimai'), chalk.cyan('para iniciar el dashboard.\n'));
  } catch (error) {
    console.error(chalk.red('  ✗ Error inicializando:'), error);
    process.exit(1);
  }
}
