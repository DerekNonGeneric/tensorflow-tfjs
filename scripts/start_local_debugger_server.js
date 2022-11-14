// Copyright 2022 Google LLC. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// =============================================================================

const express = require('express');
const {ArgumentParser} = require('argparse');
const AdmZip = require('adm-zip');
const fetch = require('node-fetch');
const path = require('node:path');

const TFJS_DEBUGGER_BUNDLE_URL =
    'https://storage.googleapis.com/tfweb/tfjs-debugger-bundle/tfjs-debugger_20221111-105432.zip';

const app = express();
const debuggerStaticFile = {};

function main(args) {
  const port = parseInt(args['port']);

  app.get('/*', (req, res) => {
    // Remove leading '/'.
    let filePath = req.path.substring(1);
    if (filePath === '') {
      filePath = 'index.html';
    }

    // Send file from the unzipped tfjs-debugger bundle from memory.
    if (debuggerStaticFile[filePath]) {
      res.contentType(path.basename(filePath));
      res.send(debuggerStaticFile[filePath]);
    }
    // Send other files from the local file system.
    else {
      const tfjsRoot = __dirname.replace('/scripts', '/');
      res.sendFile(tfjsRoot + filePath);
    }
  });

  app.listen(port, async () => {
    // On server start-up, fetch the zipped debugger bundle and unzip in memory.
    console.log('Fetching tfjs debugger static files...');
    await fetchAndUnzipTfjsDebuggerBundle();
    console.log('Done');
    console.log(`Local debugger server started at http://localhost:${
        port}/?bv__0=Local%20build&bv__1=`);
  });
}

async function fetchAndUnzipTfjsDebuggerBundle() {
  const resp = await fetch(TFJS_DEBUGGER_BUNDLE_URL);
  const buffer = await resp.buffer();
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  for (let entry of entries) {
    const buffer = entry.getData();
    const fileName = entry.entryName.replace('dist/', '');
    if (entry.entryName.endsWith('.ttf')) {
      debuggerStaticFile[fileName] = buffer;
    } else {
      debuggerStaticFile[fileName] = buffer.toString('utf-8');
    }
  }
}

const parser = new ArgumentParser({
  description: 'Run tfjs-debugger locally that supports loading local packages'
});

parser.addArgument('--port', {
  help: 'Server port',
  defaultValue: 9876,
  type: 'int',
});

main(parser.parseArgs());