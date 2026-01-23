#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { serveCommand } from './commands/serve.js';
import { importCommand } from './commands/import.js';

const program = new Command();

program
  .name('optimai')
  .description('Centro de control personal - Dashboard local')
  .version('0.1.0');

// Default command (serve)
program
  .option('-p, --port <port>', 'Puerto para el dashboard web', '3000')
  .option('--no-open', 'No abrir navegador automáticamente')
  .action(async (options) => {
    await serveCommand({ port: parseInt(options.port), open: options.open });
  });

// Init command
program
  .command('init')
  .description('Inicializar directorio ~/optimai/')
  .action(async () => {
    await initCommand();
  });

// Serve command (explicit)
program
  .command('serve')
  .description('Iniciar dashboard web + API local')
  .option('-p, --port <port>', 'Puerto para el dashboard web', '3000')
  .option('--no-open', 'No abrir navegador automáticamente')
  .action(async (options) => {
    await serveCommand({ port: parseInt(options.port), open: options.open });
  });

// Import command
program
  .command('import <file>')
  .description('Importar tareas desde archivo .ics (Apple Reminders)')
  .action(async (file) => {
    await importCommand(file);
  });

program.parse();
