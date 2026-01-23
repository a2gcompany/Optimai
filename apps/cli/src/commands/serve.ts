import chalk from 'chalk';
import ora from 'ora';
import open from 'open';
import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { isInitialized, initializeOptimaiDir, getConfig, OPTIMAI_DIR } from '../lib/storage.js';
import { startLocalAPI } from '../lib/local-api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function serveCommand(options: { port?: number; open?: boolean }): Promise<void> {
  console.log(chalk.cyan.bold('\n  🚀 Iniciando Optimai...\n'));

  // Ensure initialized
  if (!isInitialized()) {
    console.log(chalk.yellow('  Inicializando directorio de datos...'));
    initializeOptimaiDir();
  }

  const config = getConfig();
  const webPort = options.port || config.webPort || 3000;
  const apiPort = config.apiPort || 3001;

  // Start API server
  const apiSpinner = ora('Iniciando API local...').start();
  try {
    await startLocalAPI(apiPort);
    apiSpinner.succeed(chalk.green(`API local en http://localhost:${apiPort}`));
  } catch (error) {
    apiSpinner.fail(chalk.red('Error iniciando API'));
    console.error(error);
    process.exit(1);
  }

  // Start Next.js web app
  const webSpinner = ora('Iniciando dashboard web...').start();

  // Find the web app directory
  const webAppDir = resolve(__dirname, '../../../../web');

  // Set environment for local mode
  const env = {
    ...process.env,
    NEXT_PUBLIC_IS_LOCAL_CLI: 'true',
    NEXT_PUBLIC_LOCAL_API_URL: `http://localhost:${apiPort}`,
    PORT: String(webPort),
  };

  const webProcess = spawn('pnpm', ['dev', '-p', String(webPort)], {
    cwd: webAppDir,
    env,
    stdio: 'pipe',
  });

  // Wait for web server to be ready
  await new Promise<void>((resolve) => {
    const checkReady = (data: Buffer) => {
      const output = data.toString();
      if (output.includes('Ready') || output.includes('started server') || output.includes('localhost')) {
        webSpinner.succeed(chalk.green(`Dashboard en http://localhost:${webPort}`));
        resolve();
      }
    };

    webProcess.stdout?.on('data', checkReady);
    webProcess.stderr?.on('data', checkReady);

    // Timeout fallback
    setTimeout(() => {
      webSpinner.succeed(chalk.green(`Dashboard en http://localhost:${webPort}`));
      resolve();
    }, 5000);
  });

  // Print info
  console.log();
  console.log(chalk.dim('  ────────────────────────────────────'));
  console.log(chalk.dim('  📂 Datos en:'), OPTIMAI_DIR);
  console.log(chalk.dim('  🌐 Web:     '), chalk.cyan(`http://localhost:${webPort}`));
  console.log(chalk.dim('  🔌 API:     '), chalk.cyan(`http://localhost:${apiPort}`));
  console.log(chalk.dim('  ────────────────────────────────────'));
  console.log();
  console.log(chalk.dim('  Presiona Ctrl+C para detener\n'));

  // Open browser
  if (options.open !== false) {
    await open(`http://localhost:${webPort}`);
  }

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n  Deteniendo Optimai...'));
    webProcess.kill();
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {});
}
