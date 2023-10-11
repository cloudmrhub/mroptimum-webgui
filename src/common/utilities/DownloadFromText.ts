export default function downloadStringAsFile(content: string, fileName: string): void {
    // Step 1: Create a Blob from the string
    const blob = new Blob([content], { type: 'text/plain' });

    // Step 2: Create a URL for the Blob
    const url = URL.createObjectURL(blob);

    // Step 3: Use an anchor element to initiate the download
    const a = document.createElement('a');
    a.href = url;

    // Step 4: Set the download attribute of the anchor element
    a.download = fileName;

    // Append the anchor to the body (this is necessary for Firefox)
    document.body.appendChild(a);

    // Step 5: Simulate a click on the anchor element
    a.click();

    // Cleanup: Remove the anchor from the body and revoke the Blob URL
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
