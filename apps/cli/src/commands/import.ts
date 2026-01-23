import chalk from 'chalk';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { parseICSFile } from '../lib/ics-parser.js';
import { getTasks, saveTasks, isInitialized, initializeOptimaiDir } from '../lib/storage.js';

export async function importCommand(filePath: string): Promise<void> {
  console.log(chalk.cyan('\n  Importando recordatorios...\n'));

  // Ensure initialized
  if (!isInitialized()) {
    console.log(chalk.yellow('  Inicializando directorio de datos...'));
    initializeOptimaiDir();
  }

  // Resolve file path
  const absolutePath = resolve(process.cwd(), filePath);

  if (!existsSync(absolutePath)) {
    console.error(chalk.red('  ✗ Archivo no encontrado:'), absolutePath);
    process.exit(1);
  }

  if (!absolutePath.endsWith('.ics')) {
    console.error(chalk.red('  ✗ El archivo debe ser .ics'));
    process.exit(1);
  }

  try {
    // Parse ICS file
    console.log(chalk.dim(`  Leyendo ${absolutePath}...`));
    const newTasks = parseICSFile(absolutePath);

    if (newTasks.length === 0) {
      console.log(chalk.yellow('  ⚠️  No se encontraron tareas (VTODOs) en el archivo.'));
      return;
    }

    // Load existing tasks
    const data = getTasks();

    // Merge tasks (avoid duplicates by title)
    const existingTitles = new Set(data.tasks.map((t) => t.title.toLowerCase()));
    const tasksToAdd = newTasks.filter((t) => !existingTitles.has(t.title.toLowerCase()));
    const skipped = newTasks.length - tasksToAdd.length;

    // Add new tasks
    data.tasks.unshift(...tasksToAdd);
    saveTasks(data.tasks);

    // Report
    console.log(chalk.green(`  ✓ Importadas: ${tasksToAdd.length} tareas`));
    if (skipped > 0) {
      console.log(chalk.yellow(`  ⚠️  Omitidas:   ${skipped} duplicadas`));
    }
    console.log();

    // Show imported tasks
    if (tasksToAdd.length > 0 && tasksToAdd.length <= 10) {
      console.log(chalk.dim('  Tareas importadas:'));
      for (const task of tasksToAdd) {
        const statusIcon = task.status === 'completed' ? '✓' : '○';
        const priorityColor =
          task.priority === 'high' || task.priority === 'urgent'
            ? chalk.red
            : task.priority === 'low'
              ? chalk.dim
              : chalk.white;
        console.log(`  ${statusIcon} ${priorityColor(task.title)}`);
      }
      console.log();
    }
  } catch (error) {
    console.error(chalk.red('  ✗ Error importando:'), error);
    process.exit(1);
  }
}
