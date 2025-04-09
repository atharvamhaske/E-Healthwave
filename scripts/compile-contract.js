const path = require('path');
const fs = require('fs');
const solc = require('solc');

function findImports(importPath) {
    try {
        if (importPath.startsWith('@openzeppelin/')) {
            const npmPath = path.resolve(__dirname, '..', 'node_modules', importPath);
            return {
                contents: fs.readFileSync(npmPath, 'utf8')
            };
        }
        const fullPath = path.resolve(__dirname, '..', 'contracts', importPath);
        return {
            contents: fs.readFileSync(fullPath, 'utf8')
        };
    } catch (error) {
        return { error: 'File not found' };
    }
}

// Read the Solidity source code
const contractPath = path.resolve(__dirname, '..', 'contracts', 'HealthRecord.sol');
const source = fs.readFileSync(contractPath, 'utf8');

// Create the input object for the compiler
const input = {
    language: 'Solidity',
    sources: {
        'HealthRecord.sol': {
            content: source,
        },
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['*'],
            },
        },
    },
};

// Compile the contract
console.log('Compiling contract...');
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

// Check for errors
if (output.errors) {
    output.errors.forEach(error => {
        console.error(error.formattedMessage);
    });
}

// Extract the contract
const contract = output.contracts['HealthRecord.sol']['HealthRecord'];

// Create the contracts directory if it doesn't exist
const buildPath = path.resolve(__dirname, '..', 'contracts');
if (!fs.existsSync(buildPath)) {
    fs.mkdirSync(buildPath);
}

// Write the ABI to a file
fs.writeFileSync(
    path.resolve(buildPath, 'HealthRecord.json'),
    JSON.stringify(contract.abi, null, 2)
);

// Write the bytecode to a file
fs.writeFileSync(
    path.resolve(buildPath, 'HealthRecord.bin'),
    contract.evm.bytecode.object
);

console.log('Contract compiled successfully!');
console.log('ABI written to:', path.resolve(buildPath, 'HealthRecord.json'));
console.log('Bytecode written to:', path.resolve(buildPath, 'HealthRecord.bin'));
