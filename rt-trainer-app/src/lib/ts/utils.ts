// Simple hash function: hash * 31 + char
export function simpleHash(str: string): number {
	let hash = 0;

	if (str.length === 0) {
		return hash;
	}

	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
	}

	return hash;
}

// Splits a number into two halves and pads them with zeros to make sure they are the same length
export function splitAndPadNumber(input: number): [number, number] {
	const numberString = input.toString();
	const halfLength = Math.ceil(numberString.length / 2);
	const firstHalf = parseInt(numberString.padEnd(halfLength, '0').slice(0, halfLength));
	const secondHalf = parseInt(numberString.slice(halfLength).padEnd(halfLength, '0'));
	return [firstHalf, secondHalf];
}

// Function to generate a seeded normal distribution
export function seededNormalDistribution(
	seedString: string,
	mean: number,
	standardDeviation: number
): number {
	// Generate two 'random' numbers from seed for the Box-Muller transform
	const [v1, v2] = splitAndPadNumber(simpleHash(seedString));
	const u1 = 1 / v1;
	const u2 = 1 / v2;

	// Box-Muller transform
	const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

	// Scale and shift to get the desired mean and standard deviation
	const result = z0 * standardDeviation + mean;

	return result;
}

/* Returns the distance between two locations on the earth in metres. */
export function haversineDistance(
	lat1: number,
	long1: number,
	lat2: number,
	long2: number
): number {
	const R = 6371e3; // metres
	const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
	const φ2 = (lat2 * Math.PI) / 180;
	const Δφ = ((lat2 - lat1) * Math.PI) / 180;
	const Δλ = ((long2 - long1) * Math.PI) / 180;

	return (
		2 *
		R *
		Math.asin(
			Math.sqrt(
				Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
					Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
			)
		)
	);
}

/* Returns a lower copy of the string with single length spaces and no punctuation. */
export function processString(str: string): string {
	return trimSpaces(removePunctuation(str.toLowerCase()));
}

/* Removes all punctuation from a string. */
export function removePunctuation(str: string): string {
	return str.replace(/(?<=\d),(?=\d)|[^\d\w\s.-]/g, ' ');
}

/* Shortens all spaces to a single space. */
export function trimSpaces(str: string): string {
	return str.replace(/\s+/g, ' ');
}

/* Removes all digits from a string. */
export function removeDigits(str: string): string {
	return str.replace(/[0-9]/g, '');
}

export function isCallsignStandardRegistration(callsign: string): boolean {
	return callsign.length == 6 && callsign.charAt(1) == '-';
}

/* Returns a abbreviated callsign. */
export function getAbbreviatedCallsign(
	scenarioSeed: number,
	aircraftType: string,
	callsign: string
): string {
	let abbreviatedCallsign: string = '';
	if (callsign.length == 6) {
		if (isCallsignStandardRegistration(callsign)) {
			// G-OFLY -> G-LY
			abbreviatedCallsign += callsign.charAt(0);
			abbreviatedCallsign += '-';
			abbreviatedCallsign += callsign.charAt(4);
			abbreviatedCallsign += callsign.charAt(5);
		} else {
			abbreviatedCallsign += callsign;
		}
	} else {
		const callsign_words: string[] = callsign.split(' ');
		abbreviatedCallsign += callsign_words[0];
	}

	return abbreviatedCallsign;
}

export function replacePhoneticAlphabetDecimalWithNumber(str: string): string {
	return str.replace(/(\d{3}) decimal (\d{3})/g, '$1.$2');
}

export function numberToPhoneticString(number: number, precision: number): string {
	const phoneticNumbers = {
		'0': 'Zero',
		'1': 'One',
		'2': 'Two',
		'3': 'Three',
		'4': 'Four',
		'5': 'Five',
		'6': 'Six',
		'7': 'Seven',
		'8': 'Eight',
		'9': 'Nine'
	};

	const stringNumber = number.toFixed(precision);
	let result: string = '';

	for (let i = 0; i < stringNumber.length; i++) {
		const char = stringNumber[i];

		if (/[0-9]/.test(char)) {
			result += phoneticNumbers[char] + ' ';
		} else if (char === '-') {
			result += 'Dash ';
			continue;
		} else if (char === '.') {
			result += 'Decimal ';
		} else {
			result += char + ' ';
		}
	}

	return result.trim();
}

export function replacePhoneticAlphabetWithChars(str: string): string {
	const phoneticAlphabetMapping = {
		alpha: 'A',
		bravo: 'B',
		charlie: 'C',
		delta: 'D',
		echo: 'E',
		foxtrot: 'F',
		golf: 'G',
		hotel: 'H',
		india: 'I',
		juliet: 'J',
		kilo: 'K',
		lima: 'L',
		mike: 'M',
		november: 'N',
		oscar: 'O',
		papa: 'P',
		quebec: 'Q',
		romeo: 'R',
		sierra: 'S',
		tango: 'T',
		uniform: 'U',
		victor: 'V',
		whiskey: 'W',
		xray: 'X',
		yankee: 'Y',
		zulu: 'Z',
		zero: '0',
		one: '1',
		two: '2',
		three: '3',
		four: '4',
		five: '5',
		six: '6',
		seven: '7',
		eight: '8',
		niner: '9'
	};

	// Create a regular expression pattern to match any of the phonetic alphabet words
	const pattern = new RegExp(Object.keys(phoneticAlphabetMapping).join('|'), 'gi');

	// Replace occurrences of phonetic alphabet words with their corresponding characters
	return str.replace(pattern, (match) => phoneticAlphabetMapping[match.toLowerCase()]).trim();
}

export function replaceWithPhoneticAlphabet(text: string) {
	const phoneticAlphabet = {
		A: 'Alpha',
		B: 'Bravo',
		C: 'Charlie',
		D: 'Delta',
		E: 'Echo',
		F: 'Foxtrot',
		G: 'Golf',
		H: 'Hotel',
		I: 'India',
		J: 'Juliet',
		K: 'Kilo',
		L: 'Lima',
		M: 'Mike',
		N: 'November',
		O: 'Oscar',
		P: 'Papa',
		Q: 'Quebec',
		R: 'Romeo',
		S: 'Sierra',
		T: 'Tango',
		U: 'Uniform',
		V: 'Victor',
		W: 'Whiskey',
		X: 'X-ray',
		Y: 'Yankee',
		Z: 'Zulu'
	};

	const phoneticNumbers = {
		'0': 'Zero',
		'1': 'One',
		'2': 'Two',
		'3': 'Three',
		'4': 'Four',
		'5': 'Five',
		'6': 'Six',
		'7': 'Seven',
		'8': 'Eight',
		'9': 'Niner'
	};

	const upperText = text.toUpperCase();

	let result = '';
	for (let i = 0; i < upperText.length; i++) {
		const char = upperText[i];

		if (/[A-Z]/.test(char)) {
			const natoWord = phoneticAlphabet[char];
			result += natoWord + ' ';
		} else if (/[0-9]/.test(char)) {
			const natoNumber = phoneticNumbers[char];
			result += natoNumber + ' ';
		} else if (char === '-') {
			// Ignore hyphens
			continue;
		} else if (char === '.') {
			result += 'Decimal ';
		} else {
			result += char + ' ';
		}
	}

	return result.trim();
}

export function generateRandomURLValidString(length: number) {
	const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let randomString = '';

	for (let i = 0; i < length; i++) {
		const randomIndex = Math.floor(Math.random() * charset.length);
		randomString += charset.charAt(randomIndex);
	}

	return randomString;
}

/* Following four functions from https://www.trysmudford.com/blog/linear-interpolation-functions/ */
export const lerp = (x: number, y: number, a: number) => x * (1 - a) + y * a;
export const invlerp = (x: number, y: number, a: number) => clamp((a - x) / (y - x));
export const clamp = (a: number, min = 0, max = 1) => Math.min(max, Math.max(min, a));
export const range = (x1: number, y1: number, x2: number, y2: number, a: number) =>
	lerp(x2, y2, invlerp(x1, y1, a));

export const lerpLocation = (
	lat1: number,
	long1: number,
	lat2: number,
	long2: number,
	a: number
): { lat: number; long: number } => {
	return {
		lat: lerp(lat1, lat2, a),
		long: lerp(long1, long2, a)
	};
};

export function toRadians(degrees: number): number {
	return degrees * (Math.PI / 180);
}

export function toDegrees(radians: number): number {
	return radians * (180 / Math.PI);
}

export function getHeadingBetween(
	lat1: number,
	long1: number,
	lat2: number,
	long2: number
): number {
	const dLon = toRadians(long2 - long1);

	const y = Math.sin(dLon) * Math.cos(toRadians(lat2));
	const x =
		Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
		Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLon);

	const bearing = toDegrees(Math.atan2(y, x));

	// Normalize the bearing to be in the range [0, 360)
	return Math.round((bearing + 360) % 360);
}

export function getNewCoordsFromCoord(
	startLat: number,
	startLong: number,
	angle: number, // Angle in degrees (bearing from the starting point)
	distance: number // Distance in kilometers
): { lat: number; long: number } {
	const earthRadius = 6371; // Earth's radius in kilometers

	const startLatRad = toRadians(startLat);
	const startLongRad = toRadians(startLong);
	const angleRad = toRadians(angle);

	const newLatRad = Math.asin(
		Math.sin(startLatRad) * Math.cos(distance / earthRadius) +
			Math.cos(startLatRad) * Math.sin(distance / earthRadius) * Math.cos(angleRad)
	);

	const newLongRad =
		startLongRad +
		Math.atan2(
			Math.sin(angleRad) * Math.sin(distance / earthRadius) * Math.cos(startLatRad),
			Math.cos(distance / earthRadius) - Math.sin(startLatRad) * Math.sin(newLatRad)
		);

	const newLat = toDegrees(newLatRad);
	const newLong = toDegrees(newLongRad);

	return { lat: newLat, long: newLong };
}
