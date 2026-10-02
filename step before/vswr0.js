
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
	const feedingImpedanceInput = parseFloat(document.getElementById('feedingImpedance')?.value);

	// Validation
	if (isNaN(feedingImpedanceInput) || feedingImpedanceInput <= 0) {
		alert('Please enter a valid feeding line characteristic impedance');
		return;
	}

	// Get frequencies with loads
	const frequenciesWithLoads = getFrequenciesWithLoads();
	if (frequenciesWithLoads.length === 0) {
		alert('Please enter at least one frequency with resistance and reactance values');
		return;
	}
	// feeding line characteristic impedance (measurement/reference) - named Ro_feed
	const Ro_feed = new Complex(feedingImpedanceInput, 0);
	// velocity factor
	const vFactorInput = parseFloat(document.getElementById('velocityFactor')?.value);
	const velocityFactor = (!isNaN(vFactorInput) && vFactorInput > 0) ? vFactorInput : 1.0;
	// RF lines definitions (lengths in mm in UI) and characteristic impedances
	const line1Length_mm = parseFloat(document.getElementById('line1Length')?.value);
	const line2Length_mm = parseFloat(document.getElementById('line2Length')?.value);
	const line1Z0_input = parseFloat(document.getElementById('line1Z0')?.value);
	const line2Z0_input = parseFloat(document.getElementById('line2Z0')?.value);

	const totalLine1_m = (isNaN(line1Length_mm) ? 0 : line1Length_mm) / 1000.0;
	const totalLine2_m = (isNaN(line2Length_mm) ? 0 : line2Length_mm) / 1000.0;
	const Ro_line1 = new Complex((!isNaN(line1Z0_input) && line1Z0_input > 0) ? line1Z0_input : Ro_feed.real, 0);
	const Ro_line2 = new Complex((!isNaN(line2Z0_input) && line2Z0_input > 0) ? line2Z0_input : Ro_feed.real, 0);

	// Log RF line parameters as objects with keys L (length in mm) and Ro (characteristic impedance)
	try {
		console.log('RF Line 1 params:', { L: isNaN(line1Length_mm) ? 0 : line1Length_mm, Ro: Ro_line1.real });
		console.log('RF Line 2 params:', { L: isNaN(line2Length_mm) ? 0 : line2Length_mm, Ro: Ro_line2.real });
	} catch (e) {
		// ignore logging errors
	}

	// Calculate VSWR for each frequency
	const results = [];
	frequenciesWithLoads.forEach(item => {
		// compute load impedance (Zload)
		const Zload = new Complex(item.resistance, item.reactance);

		// compute stub input impedance for a shorted stub of length Lstub
		// Z_stub_input = j * Z0 * tan(beta * Lstub)
		// where beta = 2*pi*f / v_p, v_p = c * velocityFactor
		const c = 299792458; // speed of light m/s
		const freqHz = item.frequency * 1e6;
		const vp = c * velocityFactor;
		const beta = 2 * Math.PI * freqHz / vp; // rad/m

		// Shorted stub is Line 1
		const Lstub = totalLine1_m;
		const tan_term = Math.tan(beta * Lstub);
		// shorted stub input impedance (pure imaginary) using Ro_line1
		const Ro_stub_input = new Complex(0, Ro_line1.real * tan_term);

		// Now combine the stub in parallel with the load at the junction point
		// Z_parallel = 1 / (1/Z_load + 1/Z_stub_input)
		function parallel(Za, Zb) {
			// Za || Zb = (Za * Zb) / (Za + Zb)
			return Za.multiply(Zb).divide(Za.add(Zb));
		}

		const Ro_combined = parallel(Zload, Ro_stub_input);

		// Now, account for main transmission line length between source/reference plane and junction
		// Transform Z_combined through a transmission line of length L (mainline)
		// Using: Z_in = Z0 * (Z_load + j Z0 tan(beta L)) / (Z0 + j Z_load tan(beta L))
		// Main line is Line 2 - transform Z_combined through Line 2 towards feeding plane
		const Lmain = totalLine2_m;
		const tan_main = Math.tan(beta * Lmain);

		const denom_alt = Ro_line2.add(Ro_combined.multiply(new Complex(0, tan_main)));
		const numer_alt = Ro_combined.add(new Complex(0, Ro_line2.real * tan_main));
		const Zin = Ro_line2.multiply(numer_alt).divide(denom_alt);

		// Compute VSWR referenced to feeding line impedance (Ro_feed)
		const vswr_data = calculateVSWRfromImpedance(Zin, Ro_feed);

		// Log Zin (enter complex impedance) to the JS console
		try {
			console.log(`Zin at feed (${item.frequency} MHz): ${Zin.toDisplayString()} [${Zin.real.toFixed(4)} + j${Zin.imag.toFixed(4)}]`);
		} catch (e) {
			// ignore logging errors in older browsers
		}

		results.push({
			frequency: item.frequency,
			load_impedance: Zin,
			gamma: vswr_data.gamma_string,
			gamma_mag: vswr_data.gamma_magnitude,
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
		resultsBody.innerHTML = '<tr><td colspan="2" class="no-results">No results to display</td></tr>';
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
	// Build results: line parameters and maximum VSWR
	const line1Len = document.getElementById('line1Length').value || '0';
	const line1Z0 = document.getElementById('line1Z0').value || '0';
	const line2Len = document.getElementById('line2Length').value || '0';
	const line2Z0 = document.getElementById('line2Z0').value || '0';

	const items = [
		{p: 'Line 1 Length (mm)', v: `${parseFloat(line1Len).toFixed(2)}`},
		{p: 'Line 1 Ro (Ω)', v: `${parseFloat(line1Z0).toFixed(2)}`},
		{p: 'Line 2 Length (mm)', v: `${parseFloat(line2Len).toFixed(2)}`},
		{p: 'Line 2 Ro (Ω)', v: `${parseFloat(line2Z0).toFixed(2)}`},
		{p: 'Maximum VSWR', v: `${maxResult.vswr}`},
	];

	// Compute mismatch loss (dB) from max gamma magnitude: Mismatch Loss = -10*log10(1 - |Γ|^2)
	const gamma_mag = maxResult.gamma_mag || 0;
	let mismatchLoss = '0.00';
	if (gamma_mag >= 1) {
		mismatchLoss = '∞';
	} else {
		const ml = -10 * Math.log10(1 - gamma_mag * gamma_mag);
		mismatchLoss = `${ml.toFixed(2)} dB`;
	}
	items.push({p: 'Mismatch Loss', v: mismatchLoss});

	items.forEach(it => {
		const r = document.createElement('tr');
		r.innerHTML = `<td>${it.p}</td><td>${it.v}</td>`;
		resultsBody.appendChild(r);
	});
}

/**
 * Clear results
 */
function clearResults() {
	document.getElementById('resultsBody').innerHTML = 
		'<tr><td colspan="2" class="no-results">Results will appear here after calculation</td></tr>';
}

function clearConsole() {
	try {
		console.clear();
	} catch (e) {
		// some browsers may restrict console.clear; ignore
	}
}

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', () => {
	// Set default value for characteristic impedance
	const feedingImpedance = document.getElementById('feedingImpedance');
	if (feedingImpedance && feedingImpedance.value === '') {
		feedingImpedance.value = '50';
	}

	// Add one default empty row
	addFrequencyRow();
});

