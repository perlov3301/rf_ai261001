/**
 * VSWR Calculator for Complex Load Impedance
 * Calculates Voltage Standing Wave Ratio across multiple frequencies with user-defined loads per frequency
 */

/**
 * Complex number operations
 */
class Complex {
    constructor(real = 0, imag = 0) {
        this.real = real;
        this.imag = imag;
    }

    // Addition
    add(other) {
        return new Complex(this.real + other.real, this.imag + other.imag);
    }

    // Subtraction
    subtract(other) {
        return new Complex(this.real - other.real, this.imag - other.imag);
    }

    // Multiplication
    multiply(other) {
        const real = this.real * other.real - this.imag * other.imag;
        const imag = this.real * other.imag + this.imag * other.real;
        return new Complex(real, imag);
    }

    // Division
    divide(other) {
        const denominator = other.real ** 2 + other.imag ** 2;
        const real = (this.real * other.real + this.imag * other.imag) / denominator;
        const imag = (this.imag * other.real - this.real * other.imag) / denominator;
        return new Complex(real, imag);
    }

    // Magnitude
    magnitude() {
        return Math.sqrt(this.real ** 2 + this.imag ** 2);
    }

    // Phase in radians
    phase() {
        return Math.atan2(this.imag, this.real);
    }

    // String representation
    toString() {
        const sign = this.imag >= 0 ? '+' : '';
        return `${this.real.toFixed(2)} ${sign} j${this.imag.toFixed(2)}`;
    }

    // Convert to string for display
    toDisplayString() {
        if (Math.abs(this.imag) < 0.001) {
            return `${this.real.toFixed(2)}`;
        }
        if (Math.abs(this.real) < 0.001) {
            return `j${this.imag.toFixed(2)}`;
        }
        const sign = this.imag >= 0 ? '+' : '';
        return `${this.real.toFixed(2)} ${sign}j${this.imag.toFixed(2)}`;
    }
}

/**
 * Calculate VSWR from impedances
 * @param {Complex} Z_L - Load impedance
 * @param {Complex} Z_0 - Characteristic impedance
 * @returns {object} - Object with gamma (magnitude), VSWR, and formatted strings
 */
function calculateVSWRfromImpedance(Z_L, Z_0) {
    // Reflection coefficient: Γ = (Z_L - Z_0) / (Z_L + Z_0)
    const numerator = Z_L.subtract(Z_0);
    const denominator = Z_L.add(Z_0);
    
    // Avoid division by zero
    if (denominator.magnitude() === 0) {
        return {
            gamma_magnitude: 0,
            gamma_phase: 0,
            gamma_string: '0.00',
            vswr: 1.00,
            vswr_string: '1.00'
        };
    }

    const gamma = numerator.divide(denominator);
    const gamma_mag = gamma.magnitude();
    const gamma_phase = gamma.phase();

    // VSWR = (1 + |Γ|) / (1 - |Γ|)
    // Handle case where gamma_mag ≈ 1 (high mismatch)
    let vswr;
    if (gamma_mag >= 0.9999) {
        vswr = 999.99;
    } else {
        vswr = (1 + gamma_mag) / (1 - gamma_mag);
    }

    return {
        gamma_magnitude: gamma_mag,
        gamma_phase: gamma_phase,
        gamma_string: `${gamma_mag.toFixed(4)} ∠${(gamma_phase * 180 / Math.PI).toFixed(1)}°`,
        vswr: vswr,
        vswr_string: vswr >= 999 ? '∞' : vswr.toFixed(2)
    };
}

/**
 * Parse frequency input and generate frequency array with loads
 */
function getFrequenciesWithLoads() {
    const rows = document.querySelectorAll('.freq-input-row');
    const frequencies = [];

    rows.forEach(row => {
        const freqInput = row.querySelector('.freq-input');
        const resistanceInput = row.querySelector('.resistance-input');
        const reactanceInput = row.querySelector('.reactance-input');

        const freq = parseFloat(freqInput.value);
        const resistance = parseFloat(resistanceInput.value);
        const reactance = parseFloat(reactanceInput.value);

        if (!isNaN(freq) && freq > 0 && !isNaN(resistance) && !isNaN(reactance)) {
            frequencies.push({
                frequency: freq,
                resistance: resistance,
                reactance: reactance
            });
        }
    });

    // Sort by frequency
    frequencies.sort((a, b) => a.frequency - b.frequency);

    return frequencies;
}

/**
 * Add a new frequency row to the table
 */
function addFrequencyRow() {
    const tbody = document.getElementById('freqTableBody');
    const row = document.createElement('tr');
    row.className = 'freq-input-row';
    row.innerHTML = `
        <td><input type="number" class="freq-input" placeholder="e.g., 100" step="any"></td>
        <td><input type="number" class="resistance-input" placeholder="e.g., 50" step="any"></td>
        <td><input type="number" class="reactance-input" placeholder="e.g., 0" step="any"></td>
        <td><button type="button" class="remove-btn" onclick="removeFrequencyRow(this)">Remove</button></td>
    `;
    tbody.appendChild(row);
}

/**
 * Remove a frequency row from the table
 */
function removeFrequencyRow(button) {
    const row = button.closest('tr');
    row.remove();
}

/**
 * Main calculation function - Updated to use frequency-specific loads
 */
function calculateVSWR() {
    // Get input values
    const charImpedance = parseFloat(document.getElementById('charImpedance').value);

    // Validation
    if (isNaN(charImpedance)) {
        alert('Please enter valid characteristic impedance');
        return;
    }

    if (charImpedance <= 0) {
        alert('Characteristic impedance must be greater than 0');
        return;
    }

    // Get frequencies with loads
    const frequenciesWithLoads = getFrequenciesWithLoads();
    if (frequenciesWithLoads.length === 0) {
        alert('Please enter at least one frequency with resistance and reactance values');
        return;
    }

    // Create characteristic impedance as complex number
    const Z_0 = new Complex(charImpedance, 0);

    // Calculate VSWR for each frequency
    const results = [];
    frequenciesWithLoads.forEach(item => {
        const Z_L = new Complex(item.resistance, item.reactance);
        const vswr_data = calculateVSWRfromImpedance(Z_L, Z_0);
        
        results.push({
            frequency: item.frequency,
            load_impedance: Z_L,
            gamma: vswr_data.gamma_string,
            vswr: vswr_data.vswr_string,
            vswr_value: vswr_data.vswr
        });
    });

    // Display results
    displayResults(results);
}

/**
 * Display results in the table - shows only the maximum VSWR
 */
function displayResults(results) {
    const resultsBody = document.getElementById('resultsBody');
    resultsBody.innerHTML = '';

    if (results.length === 0) {
        resultsBody.innerHTML = '<tr><td colspan="4" class="no-results">No results to display</td></tr>';
        return;
    }

    // Find result with maximum VSWR
    let maxResult = results[0];
    let maxVSWRValue = maxResult.vswr_value;

    for (let i = 1; i < results.length; i++) {
        if (results[i].vswr_value > maxVSWRValue) {
            maxVSWRValue = results[i].vswr_value;
            maxResult = results[i];
        }
    }

    // Display only the maximum VSWR result
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${maxResult.frequency.toFixed(2)}</td>
        <td>${maxResult.load_impedance.toDisplayString()}</td>
        <td>${maxResult.gamma}</td>
        <td><span class="vswr-value">${maxResult.vswr}</span></td>
    `;
    resultsBody.appendChild(row);

    // Show summary
    const summaryRow = document.createElement('tr');
    summaryRow.innerHTML = `
        <td colspan="4" style="background: #e8f5e9; padding: 12px; font-weight: 600; color: #2e7d32; text-align: center;">
            Maximum VSWR: <span style="font-size: 1.1em;">${maxResult.vswr}</span> at ${maxResult.frequency.toFixed(2)} MHz
        </td>
    `;
    resultsBody.appendChild(summaryRow);
}

/**
 * Clear results
 */
function clearResults() {
    document.getElementById('resultsBody').innerHTML = 
        '<tr><td colspan="4" class="no-results">Results will appear here after calculation</td></tr>';
}

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    // Set default value for characteristic impedance
    const charImpedance = document.getElementById('charImpedance');
    if (charImpedance.value === '') {
        charImpedance.value = '50';
    }

    // Add one default empty row
    addFrequencyRow();
});
