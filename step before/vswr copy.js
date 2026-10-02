
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
 * Sections table helpers
 */
function addSectionRow() {
	const tbody = document.getElementById('sectionsBody');
	const row = document.createElement('tr');
	row.innerHTML = `
		<td>Section</td>
		<td><input type="number" class="stubLenMin" value="0" step="any" min="0"></td>
		<td><input type="number" class="stubLenMax" value="50" step="any" min="0"></td>
		<td><input type="number" class="stubRoMin" value="10" step="any" min="0"></td>
		<td><input type="number" class="stubRoMax" value="100" step="any" min="0"></td>
		<td><input type="number" class="mainLenMin" value="0" step="any" min="0"></td>
		<td><input type="number" class="mainLenMax" value="200" step="any" min="0"></td>
		<td><input type="number" class="mainRoMin" value="10" step="any" min="0"></td>
		<td><input type="number" class="mainRoMax" value="100" step="any" min="0"></td>
		<td><button type="button" onclick="removeSectionRow(this)" class="remove-btn">Remove</button></td>
	`;
	tbody.appendChild(row);
}

function removeSectionRow(button) {
	const row = button.closest('tr');
	row.remove();
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
	// Read sections table and choose one random set of parameters per section (used for all frequencies)
	const sectionRows = document.querySelectorAll('#sectionsBody tr');
	const sections = [];

	function randRange(min, max) {
		const mn = isNaN(min) ? 0 : min;
		const mx = isNaN(max) ? mn : max;
		if (mx < mn) return mn;
		return mn + Math.random() * (mx - mn);
	}

	sectionRows.forEach((row, idx) => {
		const stubLenMin = parseFloat(row.querySelector('.stubLenMin')?.value);
		const stubLenMax = parseFloat(row.querySelector('.stubLenMax')?.value);
		const stubRoMin = parseFloat(row.querySelector('.stubRoMin')?.value);
		const stubRoMax = parseFloat(row.querySelector('.stubRoMax')?.value);

		const mainLenMin = parseFloat(row.querySelector('.mainLenMin')?.value);
		const mainLenMax = parseFloat(row.querySelector('.mainLenMax')?.value);
		const mainRoMin = parseFloat(row.querySelector('.mainRoMin')?.value);
		const mainRoMax = parseFloat(row.querySelector('.mainRoMax')?.value);

		const stubLen_mm = randRange(stubLenMin, stubLenMax);
		const mainLen_mm = randRange(mainLenMin, mainLenMax);
		const stubRo = randRange(stubRoMin, stubRoMax);
		const mainRo = randRange(mainRoMin, mainRoMax);

		sections.push({
			stubLen_mm,
			mainLen_mm,
			stubRo,
			mainRo
		});
	});
			function addSectionRow() {
	// Log chosen parameters per section
				const existingRows = tbody.querySelectorAll('tr').length;
				const sectionNumber = Math.floor(existingRows / 2) + 1;

				const row1 = document.createElement('tr');
				row1.innerHTML = `
					<td rowspan="2">Section ${sectionNumber}</td>
					<td>Line1</td>
					<td><input type="number" class="stubLenMin" value="0" step="any" min="0"></td>
					<td><input type="number" class="stubLenMax" value="50" step="any" min="0"></td>
					<td><input type="number" class="stubRoMin" value="10" step="any" min="0"></td>
					<td><input type="number" class="stubRoMax" value="100" step="any" min="0"></td>
					<td></td>
					<td></td>
					<td></td>
					<td rowspan="2"><button type="button" onclick="removeSectionRow(this)" class="remove-btn">Remove</button></td>
				`;

				const row2 = document.createElement('tr');
				row2.innerHTML = `
					<td>Line2</td>
					<td><input type="number" class="mainLenMin" value="0" step="any" min="0"></td>
					<td><input type="number" class="mainLenMax" value="200" step="any" min="0"></td>
					<td><input type="number" class="mainRoMin" value="10" step="any" min="0"></td>
					<td><input type="number" class="mainRoMax" value="100" step="any" min="0"></td>
					<td></td>
					<td></td>
					<td></td>
				`;

				tbody.appendChild(row1);
				tbody.appendChild(row2);
		// compute stub input impedance for a shorted stub of length Lstub
		// Z_stub_input = j * Z0 * tan(beta * Lstub)
		// where beta = 2*pi*f / v_p, v_p = c * velocityFactor
		const c = 299792458; // speed of light m/s
		const freqHz = item.frequency * 1e6;
		const vp = c * velocityFactor;
		const beta = 2 * Math.PI * freqHz / vp; // rad/m

		// Process sections in order, using chosen parameters per section
		function parallel(Za, Zb) {
			return Za.multiply(Zb).divide(Za.add(Zb));
		}

		sections.forEach(s => {
			const Lstub = (isNaN(s.stubLen_mm) ? 0 : s.stubLen_mm) / 1000.0;
			const tan_stub = Math.tan(beta * Lstub);
			const Ro_stub_input = new Complex(0, s.stubRo * tan_stub);

			const Zcombined = parallel(Zcurrent, Ro_stub_input);

			const Lmain = (isNaN(s.mainLen_mm) ? 0 : s.mainLen_mm) / 1000.0;
			const tan_main = Math.tan(beta * Lmain);

			const Ro_main = new Complex(s.mainRo, 0);
			const denom_alt = Ro_main.add(Zcombined.multiply(new Complex(0, tan_main)));
			const numer_alt = Zcombined.add(new Complex(0, Ro_main.real * tan_main));
			const Zin_section = Ro_main.multiply(numer_alt).divide(denom_alt);

			// The output of this section becomes the input load for next
			Zcurrent = Zin_section;
		});

		// After all sections, Zcurrent is the final input impedance seen at feed for this frequency
		const Zin = Zcurrent;
		const vswr_data = calculateVSWRfromImpedance(Zin, Ro_feed);

		try {
			console.log(`Final Zin at feed (${item.frequency} MHz): ${Zin.toDisplayString()} [${Zin.real.toFixed(4)} + j${Zin.imag.toFixed(4)}]`);
		} catch (e) {}

		results.push({
			frequency: item.frequency,
			load_impedance: Zin,
			gamma: vswr_data.gamma_string,
			gamma_mag: vswr_data.gamma_magnitude,
			vswr: vswr_data.vswr_string,
			vswr_value: vswr_data.vswr
		});
	});

	// Compute and log maximum VSWR to console
	try {
		if (results.length > 0) {
			let maxR = results[0];
			for (let i = 1; i < results.length; i++) {
				if (results[i].vswr_value > maxR.vswr_value) maxR = results[i];
			}
			console.log('Max VSWR:', maxR.vswr, ' (numeric:', Number(maxR.vswr_value.toFixed(4)), ')');
		} else {
			console.log('Max VSWR: N/A');
		}
	} catch (e) {
		// ignore console errors
	}

	// Display results, pass chosen random parameters so displayResults can show them
	displayResults(results, {
		line1Length_mm: line1Length_mm,
		line1Z0_input: line1Z0_input,
		line2Length_mm: line2Length_mm,
		line2Z0_input: line2Z0_input
	});
}

/**
 * Display results in the table - shows only the maximum VSWR
 */
function displayResults(results, chosen) {
	const resultsBody = document.getElementById('resultsBody');
function removeSectionRow(button) {

	const next = row.nextElementSibling;
	if (next) next.remove();
	row.remove();
	// Renumber remaining sections
	const rows = document.querySelectorAll('#sectionsBody tr');
	for (let i = 0; i < rows.length; i += 2) {
		const sectionIndex = Math.floor(i / 2) + 1;
		const firstCell = rows[i].querySelector('td');
		if (firstCell) firstCell.textContent = `Section ${sectionIndex}`;
	}
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
	// Display the randomly chosen parameters (received from calculateVSWR)
	const line1Len = (chosen && typeof chosen.line1Length_mm !== 'undefined') ? `${chosen.line1Length_mm.toFixed(3)}` : '0';
	const line1Z0 = (chosen && typeof chosen.line1Z0_input !== 'undefined') ? `${chosen.line1Z0_input.toFixed(3)}` : '0';
	const line2Len = (chosen && typeof chosen.line2Length_mm !== 'undefined') ? `${chosen.line2Length_mm.toFixed(3)}` : '0';
	const line2Z0 = (chosen && typeof chosen.line2Z0_input !== 'undefined') ? `${chosen.line2Z0_input.toFixed(3)}` : '0';

	const items = [
		{p: 'Length1 (mm)', v: `${parseFloat(line1Len).toFixed(2)}`},
		{p: 'Ro1 (Ω)', v: `${parseFloat(line1Z0).toFixed(2)}`},
		{p: 'Length2 (mm)', v: `${parseFloat(line2Len).toFixed(2)}`},
		{p: 'Ro2 (Ω)', v: `${parseFloat(line2Z0).toFixed(2)}`},
		{p: 'Zin (next Zload)', v: `${maxResult.load_impedance.toDisplayString()}`},
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

