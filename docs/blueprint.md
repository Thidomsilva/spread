# **App Name**: Spread Triangulator

## Core Features:

- Input Fields: Accept user inputs for XPR/USDT price (buy), VAULTA/USDT price (sell), XPR to VAULTA factor, initial USDT, and optional trade fees.
- Automatic Calculation: Perform real-time calculations of XPR_bruto, XPR_pos_compra, XPR_liquido_para_swap (with fixed 200 XPR fee), VAULTA_recebido, USDT_final_bruto, USDT_final_liquido, and Spread_%.
- Viability Assessment: Determine and display the viability status (positive, negative, neutral) based on the calculated Spread_% with thresholds.
- Results Display: Present the calculated results (Spread_%, initial USDT vs. final USDT, intermediate quantities) in a clear, formatted card.
- Parity Comparison: Calculate and display XPR_equivalente_USDT_via_rede and Delta_relativo_% to help users compare parity, using live market rates using the 'tool' agent
- Utility Buttons: Provide buttons for resetting fees, restoring defaults, and pre-filling example data for quick testing.
- Error Handling and Tooltips: Implement clear error messaging (e.g., when XPR is insufficient) and provide a tooltip for the XPR to VAULTA factor input.

## Style Guidelines:

- Primary color: Light, desaturated blue (#A0C4FF) to convey trust and stability in financial calculations.
- Background color: Very light blue (#F0F8FF), almost white, to ensure readability and a clean aesthetic.
- Accent color: A brighter, more saturated blue (#7497FF) to highlight important results and interactive elements.
- Body and headline font: 'Inter', a grotesque-style sans-serif, for a modern and neutral look that ensures readability across devices.
- Clean, responsive layout with a single-page design. Prioritize clarity and ease of use for a focused user experience.
- Simple, geometric icons to represent different inputs and outputs. Use color sparingly to draw attention to important elements.
- Subtle transitions when updating results in real-time, providing smooth visual feedback to the user's inputs.