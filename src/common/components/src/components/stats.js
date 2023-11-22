export function calculateMean(numbers) {
    const sum = numbers.reduce((acc, val) => acc + val, 0);
    return sum / numbers.length;
}

export function calculateStandardDeviation(numbers) {
    const mean = calculateMean(numbers);
    const squareDiffs = numbers.map(value => {
        const diff = value - mean;
        return diff * diff;
    });
    const avgSquareDiff = calculateMean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
}