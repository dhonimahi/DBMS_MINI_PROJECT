// Import the library that builds PowerPoint files.
import pptxgen from 'pptxgenjs';
// Import Node's filesystem utilities for creating the output folder.
import fs from 'node:fs';

// Set the destination for the generated PowerPoint file.
const output = 'docs/FreshTrack_DBMS_Level_3_Presentation.pptx';
// Create a new presentation object.
const pptx = new pptxgen();
// Use a 16:9 widescreen slide size.
pptx.layout = 'LAYOUT_WIDE';
// Set the author's name in the document metadata.
pptx.author = 'FreshTrack Team';
// Set the course context as the presentation subject.
pptx.subject = 'DBMS Experiential Learning - Level 3';
// Set the project's full title in the document metadata.
pptx.title = 'FreshTrack - Smart Food Expiry and Waste Prediction System';
// Set the university in the document metadata.
pptx.company = 'PES University';
// Set Indian English as the document language.
pptx.lang = 'en-IN';

// Start the slide color palette with hexadecimal RGB values.
const colors = {
  // Set the dark green used for background and strong accents.
  green: '173E32',
  // Set the medium green accent.
  midGreen: '1D7A55',
  // Set the bright lime accent.
  lime: 'B9EF65',
  // Set the pale slide background.
  cream: 'F4F7F5',
  // Set the white used for cards and text.
  white: 'FFFFFF',
  // Set the dark main text color.
  ink: '15231D',
  // Set the muted supporting text color.
  muted: '738078',
  // Set the amber accent.
  amber: 'F2B84B',
  // Set the red accent.
  red: 'D85C4A',
// End the palette.
};

// Create the common layout for a slide with a title and section label.
function baseSlide(title, section) {
  // Add a new slide to the presentation.
  const slide = pptx.addSlide();
  // Use the cream canvas for the standard slide.
  slide.background = { color: colors.cream };
  // Draw the thin lime bar along the top edge.
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.12, fill: { color: colors.lime }, line: { color: colors.lime } });
  // Place the uppercase section label above the slide title.
  slide.addText(section.toUpperCase(), { x: 0.65, y: 0.3, w: 2.8, h: 0.22, fontFace: 'Aptos', fontSize: 9, bold: true, color: colors.midGreen, charSpacing: 1.5 });
  // Place the main heading beneath the section label.
  slide.addText(title, { x: 0.65, y: 0.62, w: 12, h: 0.55, fontFace: 'Aptos Display', fontSize: 28, bold: true, color: colors.ink });
  // Draw the horizontal divider below the heading.
  slide.addShape(pptx.ShapeType.line, { x: 0.65, y: 1.22, w: 12, h: 0, line: { color: 'D8E0DB', width: 1 } });
  // Place the project name at the right side of the footer.
  slide.addText('FreshTrack', { x: 11.65, y: 7.15, w: 1.05, h: 0.18, fontSize: 8, align: 'right', color: colors.muted });
  // Place the course label at the left side of the footer.
  slide.addText('DBMS Level 3', { x: 0.65, y: 7.15, w: 1.3, h: 0.18, fontSize: 8, color: colors.muted });
  // Return the slide so the caller can add its unique content.
  return slide;
// End the common layout helper.
}

// Render a bullet list with optional position, size and font overrides.
function bullets(slide, items, x = 0.85, y = 1.55, w = 11.65, h = 4.9, fontSize = 20) {
  // Convert the text items to separate bulleted paragraphs.
  slide.addText(items.map(text => ({ text, options: { bullet: { indent: 16 }, breakLine: true } })), {
    // Apply the box dimensions, typeface, size and text color.
    x, y, w, h, fontFace: 'Aptos', fontSize, color: colors.ink,
    // Add paragraph spacing and a small text margin.
    breakLine: false, paraSpaceAfterPt: 16, margin: 0.06
  // Finish adding the bullet text box.
  });
// End the bullet list helper.
}

// Render a card with a heading, body and optional accent color.
function card(slide, x, y, w, h, heading, body, accent = colors.midGreen) {
  // Draw the rounded white card with a light border.
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: colors.white }, line: { color: 'DCE4DF', width: 1 } });
  // Draw a thin colored stripe down the left edge.
  slide.addShape(pptx.ShapeType.rect, { x, y, w: 0.08, h, fill: { color: accent }, line: { color: accent } });
  // Place the heading near the top inside the card.
  slide.addText(heading, { x: x + 0.25, y: y + 0.22, w: w - 0.45, h: 0.38, fontSize: 17, bold: true, color: colors.ink });
  // Put the smaller explanatory text below the heading.
  slide.addText(body, { x: x + 0.25, y: y + 0.72, w: w - 0.45, h: h - 0.9, fontSize: 12.5, color: colors.muted, valign: 'top', breakLine: false });
// End the card helper.
}

// 1. Title
// Scope the title slide variables to this slide.
{
  // Add the title slide without the shared header and footer.
  const slide = pptx.addSlide();
  // Use a solid dark green background.
  slide.background = { color: colors.green };
  // Draw the decorative lime arc near the upper right.
  slide.addShape(pptx.ShapeType.arc, { x: 9.6, y: -0.8, w: 4.5, h: 4.5, adjustPoint: 0.25, rotate: 20, fill: { color: colors.green, transparency: 100 }, line: { color: colors.lime, transparency: 35, width: 3 } });
  // Place the FreshTrack wordmark on the cover.
  slide.addText('FRESHTRACK', { x: 0.75, y: 1.15, w: 4, h: 0.35, fontSize: 13, bold: true, color: colors.lime, charSpacing: 3 });
  // Show the full project title on two lines.
  slide.addText('Smart Food Expiry &\nWaste Prediction System', { x: 0.75, y: 1.65, w: 7.6, h: 1.45, fontFace: 'Aptos Display', fontSize: 38, bold: true, color: colors.white });
  // Show the course and project level beneath the title.
  slide.addText('DBMS Experiential Learning - Level 3', { x: 0.75, y: 3.35, w: 5.5, h: 0.32, fontSize: 18, color: 'CFDED6' });
  // Draw the accent divider above the team details.
  slide.addShape(pptx.ShapeType.line, { x: 0.75, y: 4.05, w: 6.2, h: 0, line: { color: colors.lime, width: 2 } });
  // List the two team members and their student IDs.
  slide.addText('Bhuvan Raj H  |  PES1UG25CS808\nTanmay Sridhar  |  PES1UG25CS849', { x: 0.75, y: 4.35, w: 5.9, h: 0.8, fontSize: 15, color: colors.white, breakLine: false });
  // Display the university and department near the bottom.
  slide.addText('PES University\nDepartment of Computer Science and Engineering', { x: 0.75, y: 6.28, w: 5.9, h: 0.55, fontSize: 11, color: 'AFC6BD' });
// Finish the cover slide block.
}

// Start the problem statement slide block.
{
  // Create the standard slide with the problem statement heading.
  const slide = baseSlide('Problem statement', '01 · CONTEXT');
  // Place the central problem statement above the cards.
  slide.addText('Perishable inventory is difficult to manage when expiry dates, quantities and waste events are tracked separately.', { x: 0.85, y: 1.55, w: 11.6, h: 0.85, fontSize: 24, bold: true, color: colors.green });
  // Explain why teams miss expiry dates at the batch level.
  card(slide, 0.85, 2.75, 3.75, 2.55, 'Expiry missed', 'Teams need a clear, batch-level view of stock nearing expiry.');
  // Explain why disconnected waste records hide quantity and cost.
  card(slide, 4.79, 2.75, 3.75, 2.55, 'Waste hidden', 'Waste quantities and financial loss are not connected to inventory records.', colors.amber);
  // Explain the impact of missing summaries on decisions.
  card(slide, 8.73, 2.75, 3.75, 2.55, 'Decisions delayed', 'Daily choices lack reliable product, unit and expiry-risk summaries.', colors.red);
// Finish the problem statement slide.
}

// Start the objectives slide block.
{
  // Create the standard objectives slide.
  const slide = baseSlide('Solution and objectives', '02 · OVERVIEW');
  // Summarize the batch tracking objective and the fields recorded.
  card(slide, 0.85, 1.55, 3.75, 4.55, 'Track', 'Maintain products and inventory batches with quantity, unit, supplier, purchase date, expiry date and cost.');
  // Summarize risk classification and grouped waste and inventory analytics.
  card(slide, 4.79, 1.55, 3.75, 4.55, 'Analyze', 'Classify expiry risk, calculate stock totals by unit, summarize waste and identify high-impact products.');
  // Summarize the PostgreSQL transaction and MongoDB event logging.
  card(slide, 8.73, 1.55, 3.75, 4.55, 'Control', 'Record waste through PostgreSQL transactions and capture application events in MongoDB.');
// Finish the objectives slide.
}

// Start the slide about database features beyond basic CRUD.
{
  // Create the standard project value slide.
  const slide = baseSlide('Why this is beyond CRUD', '03 · VALUE');
  // Start the list of database capabilities.
  bullets(slide, [
    // Describe earliest-expiry selection among batches with enough stock.
    'FEFO-style batch selection: waste is deducted from the earliest-expiring suitable batch.',
    // Describe date-based risk categories.
    'Expiry-risk classification is calculated from current date boundaries.',
    // Explain that the two waste writes share a transaction.
    'Stock deduction and waste insertion are protected as a database transaction.',
    // Describe the flexible MongoDB event documents and aggregation.
    'MongoDB captures flexible audit events and supports aggregation.',
    // Describe how sign-in protects access to the app.
    'Role-based authentication separates protected application access.',
  // Set the position and size of the bullet list.
  ], 0.85, 1.55, 11.6, 5.0, 19);
// Finish the project value slide.
}

// Start the architecture slide block.
{
  // Create the standard architecture slide.
  const slide = baseSlide('System architecture', '04 · DESIGN');
  // Draw the box for the browser UI.
  slide.addShape(pptx.ShapeType.roundRect, { x: 0.75, y: 2.05, w: 2.35, h: 1.15, fill: { color: colors.white }, line: { color: 'DCE4DF' } });
  // Label it as the Next.js user interface.
  slide.addText('Browser\nNext.js UI', { x: 0.75, y: 2.25, w: 2.35, h: 0.75, fontSize: 18, bold: true, align: 'center', color: colors.ink });
  // Draw the arrow from the browser to the backend.
  slide.addShape(pptx.ShapeType.chevron, { x: 3.18, y: 2.32, w: 0.55, h: 0.55, fill: { color: colors.lime }, line: { color: colors.lime } });
  // Draw the backend box.
  slide.addShape(pptx.ShapeType.roundRect, { x: 3.8, y: 1.65, w: 2.5, h: 2.0, fill: { color: colors.green }, line: { color: colors.green } });
  // Label the backend with API, validation and session responsibilities.
  slide.addText('Next.js backend\nAPI route handlers\nValidation + sessions', { x: 3.95, y: 2.0, w: 2.2, h: 1.1, fontSize: 16, bold: true, align: 'center', color: colors.white });
  // Draw the arrow toward the database boxes.
  slide.addShape(pptx.ShapeType.chevron, { x: 6.38, y: 2.32, w: 0.55, h: 0.55, fill: { color: colors.lime }, line: { color: colors.lime } });
  // Draw the PostgreSQL box.
  slide.addShape(pptx.ShapeType.roundRect, { x: 7.05, y: 1.55, w: 2.25, h: 1.25, fill: { color: 'E8F3EF' }, line: { color: colors.midGreen } });
  // Label PostgreSQL as the source of authoritative data.
  slide.addText('PostgreSQL\nAuthoritative data', { x: 7.05, y: 1.85, w: 2.25, h: 0.65, fontSize: 16, bold: true, align: 'center', color: colors.green });
  // Draw the MongoDB box beneath PostgreSQL.
  slide.addShape(pptx.ShapeType.roundRect, { x: 7.05, y: 3.05, w: 2.25, h: 1.25, fill: { color: 'EDF5E2' }, line: { color: '78A548' } });
  // Label MongoDB as the event document store.
  slide.addText('MongoDB\nEvent documents', { x: 7.05, y: 3.35, w: 2.25, h: 0.65, fontSize: 16, bold: true, align: 'center', color: colors.green });
  // Draw the final arrow toward the UI features summary.
  slide.addShape(pptx.ShapeType.chevron, { x: 9.4, y: 2.32, w: 0.55, h: 0.55, fill: { color: colors.lime }, line: { color: colors.lime } });
  // Draw a box for that summary.
  slide.addShape(pptx.ShapeType.roundRect, { x: 10.05, y: 1.8, w: 2.45, h: 1.55, fill: { color: colors.white }, line: { color: 'DCE4DF' } });
  // List the dashboard, inventory and waste pages.
  slide.addText('UI features\nDashboard\nInventory\nWaste history', { x: 10.05, y: 2.05, w: 2.45, h: 1.05, fontSize: 16, bold: true, align: 'center', color: colors.ink });
  // Add a note that MongoDB logging is best effort and PostgreSQL holds the inventory.
  slide.addText('PostgreSQL and MongoDB are independent stores. MongoDB event logging is best-effort and does not replace the source-of-truth inventory records.', { x: 1.1, y: 5.15, w: 11.1, h: 0.75, fontSize: 15, italic: true, color: colors.muted, align: 'center', fill: { color: 'EAF0EC' }, margin: 0.14 });
// Finish the architecture slide.
}

// Start the entity relationship slide block.
{
  // Create the standard ER model slide.
  const slide = baseSlide('ER model', '05 · SQL DATABASE');
  // Draw the products entity box.
  slide.addShape(pptx.ShapeType.roundRect, { x: 0.75, y: 2.05, w: 2.25, h: 0.85, fill: { color: 'D9F5EF' }, line: { color: colors.green } });
  // Label the products entity.
  slide.addText('PRODUCTS', { x: 0.75, y: 2.31, w: 2.25, h: 0.3, fontSize: 17, bold: true, align: 'center' });
  // Draw the inventory batches entity box.
  slide.addShape(pptx.ShapeType.roundRect, { x: 5.55, y: 1.65, w: 2.6, h: 0.85, fill: { color: 'D9F5EF' }, line: { color: colors.green } });
  // Label the inventory batches entity.
  slide.addText('INVENTORY_BATCHES', { x: 5.55, y: 1.91, w: 2.6, h: 0.3, fontSize: 16, bold: true, align: 'center' });
  // Draw the waste records entity box.
  slide.addShape(pptx.ShapeType.roundRect, { x: 10.15, y: 2.05, w: 2.25, h: 0.85, fill: { color: 'D9F5EF' }, line: { color: colors.green } });
  // Label the waste records entity.
  slide.addText('WASTE_RECORDS', { x: 10.15, y: 2.31, w: 2.25, h: 0.3, fontSize: 17, bold: true, align: 'center' });
  // Draw the separate app users entity box.
  slide.addShape(pptx.ShapeType.roundRect, { x: 0.75, y: 4.45, w: 2.25, h: 0.85, fill: { color: 'FFF0D0' }, line: { color: colors.amber } });
  // Label the app users entity.
  slide.addText('APP_USERS', { x: 0.75, y: 4.71, w: 2.25, h: 0.3, fontSize: 17, bold: true, align: 'center' });
  // Draw the line from products to inventory batches.
  slide.addShape(pptx.ShapeType.line, { x: 3.0, y: 2.47, w: 2.55, h: 0, line: { color: colors.green, width: 2 } });
  // Mark the product end of the relationship as one.
  slide.addText('1', { x: 3.15, y: 2.18, w: 0.2, h: 0.25, fontSize: 14, bold: true });
  // Mark the batch end of the relationship as many.
  slide.addText('many', { x: 4.8, y: 2.18, w: 0.55, h: 0.25, fontSize: 12 });
  // Draw the line from inventory batches to waste records.
  slide.addShape(pptx.ShapeType.line, { x: 8.15, y: 2.47, w: 2.0, h: 0, line: { color: colors.green, width: 2 } });
  // Mark the batch end of that relationship as one.
  slide.addText('1', { x: 8.45, y: 2.18, w: 0.2, h: 0.25, fontSize: 14, bold: true });
  // Mark the waste records end as many.
  slide.addText('many', { x: 9.55, y: 2.18, w: 0.55, h: 0.25, fontSize: 12 });
  // Start the list explaining entity relationships and rules.
  bullets(slide, [
    // Describe the product-to-batch relationship.
    'One product has many inventory batches.',
    // Describe the product-to-waste relationship.
    'One product identifies many waste records.',
    // Describe the batch-to-waste relationship.
    'A batch may relate to multiple waste records.',
    // Summarize the constraint types used for integrity.
    'Primary, foreign, unique and check constraints maintain integrity.',
  // Set the placement and font size of the relationship notes.
  ], 0.85, 4.15, 7.2, 2.15, 17);
// Finish the ER model slide.
}

// Start the relational schema slide block.
{
  // Create the standard relational schema slide.
  const slide = baseSlide('Relational schema and integrity', '06 · SQL DATABASE');
  // Start the summary table for the four entities.
  slide.addTable([
    // Set the table's column headings.
    ['Table', 'Key information'],
    // Summarize the account key, unique email, hash and role.
    ['app_users', 'id PK; email UNIQUE; password_hash; admin/staff role'],
    // Summarize the product key, unique name and category.
    ['products', 'id PK; unique name; category'],
    // Summarize the batch key, product reference and stock fields.
    ['inventory_batches', 'id PK; product_id FK; quantities, dates, cost and supplier; non-negative checks'],
    // Summarize the waste record key, references and loss details.
    ['waste_records', 'id PK; product_id FK; batch_id FK; quantity, reason, loss and notes'],
  // Set the summary table's position and appearance.
  ], { x: 0.85, y: 1.55, w: 11.65, h: 2.7, border: { color: 'DCE4DF' }, fill: colors.white, color: colors.ink, fontSize: 15, bold: false, rowH: 0.55 });
  // Place the heading for the integrity rules beneath the table.
  slide.addText('Integrity decisions', { x: 0.85, y: 4.65, w: 2.4, h: 0.35, fontSize: 18, bold: true, color: colors.green });
  // List the delete rules, stock and waste quantity restrictions, and expiry date check.
  bullets(slide, ['Deletion restricted for products used by inventory/waste.', 'Batch quantity cannot be negative.', 'Waste quantity must be positive.', 'Expiry date cannot precede purchase date.', 'Batch deletion sets waste batch references to NULL.'], 0.85, 5.05, 11.4, 1.55, 14);
// Finish the relational schema slide.
}

// Start the advanced SQL slide block.
{
  // Create the standard SQL features slide.
  const slide = baseSlide('Advanced SQL demonstrated', '07 · SQL FEATURES');
  // Explain that stock deduction and waste insertion commit together.
  card(slide, 0.85, 1.55, 3.75, 1.7, 'Transactions', 'FEFO batch update and waste insert commit together.', colors.midGreen);
  // Explain the computed expiry risk view.
  card(slide, 4.79, 1.55, 3.75, 1.7, 'View', 'Expiry-risk status is derived for active batches.', colors.midGreen);
  // Explain the trigger that refreshes the modification timestamp.
  card(slide, 8.73, 1.55, 3.75, 1.7, 'Trigger', 'Batch update automatically refreshes updated_at.', colors.midGreen);
  // Summarize the indexed search fields.
  card(slide, 0.85, 3.55, 3.75, 1.7, 'Indexes', 'Expiry, product and waste-date queries are indexed.', colors.amber);
  // Summarize the key, uniqueness and check constraints.
  card(slide, 4.79, 3.55, 3.75, 1.7, 'Constraints', 'Primary/foreign keys, uniqueness and check validation.', colors.amber);
  // List the SQL query techniques used in the demonstration.
  card(slide, 8.73, 3.55, 3.75, 1.7, 'Queries', 'JOIN, GROUP BY, HAVING, aggregates, subqueries and EXPLAIN.', colors.amber);
  // Add the closing statement about the database's role.
  slide.addText('These features make the database an active design component—not a passive storage layer.', { x: 1.6, y: 5.85, w: 10.15, h: 0.55, fontSize: 17, italic: true, align: 'center', color: colors.muted });
// Finish the advanced SQL slide.
}

// Start the MongoDB slide block.
{
  // Create the standard document database slide.
  const slide = baseSlide('MongoDB data and retrieval', '08 · NOSQL DATABASE');
  // Label the event collection.
  slide.addText('Collection: inventory_events', { x: 0.85, y: 1.55, w: 4.0, h: 0.4, fontSize: 20, bold: true, color: colors.green });
  // Place an example waste event document in a code-style text box.
  slide.addText('{\\n  type: \"waste_recorded\",\\n  entityType: \"waste_record\",\\n  entityId: 42,\\n  details: { productId: 3, quantity: 2 },\\n  createdAt: ISODate(...)\\n}', { x: 0.85, y: 2.05, w: 5.05, h: 3.2, fontFace: 'Courier New', fontSize: 15, color: colors.ink, fill: { color: 'EFF4F1' }, margin: 0.22 });
  // Start the list explaining the event store.
  bullets(slide, [
    // Explain the collection's activity logging role.
    'Stores flexible application activity and audit details.',
    // Explain why the detail fields can vary.
    'Document structure varies by event type.',
    // Mention grouping MongoDB events by event type.
    'MongoDB aggregation groups events by type.',
    // Mention the types of reads that indexes could support.
    'Indexes can support recent-event and entity lookups.',
    // Explain that event writes are attempted after the SQL commit.
    'Writing events is best-effort after PostgreSQL commits.',
  // Set the placement and font size of the event notes.
  ], 6.45, 1.75, 5.85, 4.2, 17);
// Finish the MongoDB slide.
}

// Start the authentication slide block.
{
  // Create the standard security slide.
  const slide = baseSlide('Authentication and authorization', '09 · SECURITY');
  // Introduce the administrator account role.
  card(slide, 0.85, 1.55, 3.75, 4.4, 'Admin', 'Full application access. Demonstrates privileged management responsibilities.', colors.green);
  // Introduce the staff account role.
  card(slide, 4.79, 1.55, 3.75, 4.4, 'Staff', 'Operational access for inventory and waste workflows.', colors.midGreen);
  // Describe the use of bcrypt and signed HTTP-only cookies.
  card(slide, 8.73, 1.55, 3.75, 4.4, 'Session protection', 'Passwords are bcrypt hashed. Signed HTTP-only cookies protect backend routes and APIs.', colors.amber);
  // Point to the backend routes and middleware as the location of session enforcement.
  slide.addText('Role enforcement is performed in backend route handlers and middleware—not only hidden in the interface.', { x: 1.1, y: 6.1, w: 11.1, h: 0.45, fontSize: 16, bold: true, align: 'center', color: colors.green });
// Finish the authentication slide.
}

// Start the application UI slide block.
{
  // Create the standard application interface slide.
  const slide = baseSlide('Next.js application interface', '10 · APPLICATION');
  // Summarize the four dashboard metrics.
  card(slide, 0.85, 1.55, 3.75, 4.1, 'Dashboard', 'Active batches, expiry risk, stock grouped by unit and 30-day waste loss.');
  // Summarize adding and editing inventory batches.
  card(slide, 4.79, 1.55, 3.75, 4.1, 'Inventory', 'Add and edit batches with validated dates, quantities, units and costs.');
  // Explain recording waste and deducting stock.
  card(slide, 8.73, 1.55, 3.75, 4.1, 'Waste records', 'Record reason, quantity and loss; stock updates from the selected batch.');
  // Display the flow from Next.js routes to PostgreSQL and MongoDB.
  slide.addText('API routes: Next.js Route Handlers  →  PostgreSQL pool  →  MongoDB event logger', { x: 1.2, y: 6.05, w: 10.9, h: 0.4, fontSize: 16, bold: true, align: 'center', color: colors.midGreen });
// Finish the application interface slide.
}

// Start the waste transaction slide block.
{
  // Create the standard database operations slide.
  const slide = baseSlide('Waste transaction walkthrough', '11 · DATABASE OPERATIONS');
  // Define the five steps to arrange across the slide.
  const steps = [
    // Describe validation of the submitted waste fields.
    ['1', 'Validate request', 'Product, quantity, reason and loss.'],
    // Describe selecting and locking an eligible batch.
    ['2', 'Select batch', 'Lock earliest-expiring sufficient batch.'],
    // Describe deducting the discarded quantity.
    ['3', 'Update stock', 'Decrease the selected batch quantity.'],
    // Describe inserting the matching history record.
    ['4', 'Insert record', 'Create the matching waste record.'],
    // Describe committing both operations or undoing them.
    ['5', 'Commit or roll back', 'Both operations succeed together.'],
  // Finish the list of transaction steps.
  ];
  // Render each step with its position in the sequence.
  steps.forEach(([number, heading, body], index) => {
    // Calculate the horizontal position from the step index.
    const x = 0.75 + index * 2.48;
    // Draw a colored circle for the step number.
    slide.addShape(pptx.ShapeType.ellipse, { x: x, y: 1.75, w: 0.5, h: 0.5, fill: { color: colors.lime }, line: { color: colors.lime } });
    // Place the number in the center of the circle.
    slide.addText(number, { x, y: 1.86, w: 0.5, h: 0.2, fontSize: 12, bold: true, align: 'center' });
    // Place the step heading beneath its number.
    slide.addText(heading, { x: x - 0.1, y: 2.45, w: 1.95, h: 0.5, fontSize: 15, bold: true, align: 'center', color: colors.green });
    // Place the short explanation beneath the heading.
    slide.addText(body, { x: x - 0.1, y: 3.05, w: 1.95, h: 1.15, fontSize: 13, align: 'center', color: colors.muted });
    // Draw a right arrow after every step except the last one.
    if (index < 4) slide.addShape(pptx.ShapeType.chevron, { x: x + 2.05, y: 1.82, w: 0.35, h: 0.35, fill: { color: '9EBBAC' }, line: { color: '9EBBAC' } });
  // Finish drawing the step sequence.
  });
  // Explain the role of the row lock and rollback in preserving stock consistency.
  slide.addText('FOR UPDATE prevents concurrent stock races; ROLLBACK protects consistency when any step fails.', { x: 1.4, y: 5.35, w: 10.55, h: 0.65, fontSize: 16, bold: true, align: 'center', fill: { color: 'EAF0EC' }, margin: 0.12, color: colors.ink });
// Finish the transaction slide.
}

// Start the validation and testing slide block.
{
  // Create the standard validation slide.
  const slide = baseSlide('Validation and testing', '12 · QUALITY');
  // Start the slide's table of recorded test results.
  slide.addTable([
    // Set the result table column labels.
    ['Check', 'Result'],
    // Show the recorded production build result.
    ['Production build', 'Passed'],
    // Show the recorded TypeScript check result.
    ['TypeScript check', 'Passed'],
    // Show the recorded integration test count.
    ['Integration suite', '7 passed / 0 failed'],
    // Show the expected successful page response.
    ['Dashboard and page routes', 'HTTP 200'],
    // Show the result of submitting bad field values.
    ['Invalid input', 'Rejected without writes'],
    // Show the result of attempting an overlarge stock deduction.
    ['Insufficient stock', 'Rejected without waste row'],
    // Show the recorded database connectivity results.
    ['PostgreSQL and MongoDB checks', 'Passed'],
  // Set the test table's placement and styling.
  ], { x: 0.85, y: 1.55, w: 7.15, h: 4.55, border: { color: 'DCE4DF' }, fill: colors.white, color: colors.ink, fontSize: 16 });
  // Describe the checks that compare API results with the databases and verify rejected writes.
  card(slide, 8.45, 1.55, 4.05, 4.55, 'Testing approach', 'Read-only integration checks compare API results with PostgreSQL aggregates. Invalid writes and insufficient-stock cases verify row counts remain unchanged.', colors.midGreen);
// Finish the test slide.
}

// Start the demonstration schedule slide block.
{
  // Create the standard slide for the 30-minute demo plan.
  const slide = baseSlide('Demonstration plan - 30 minutes', '13 · DEMO');
  // Start the timeline as a bulleted list.
  bullets(slide, [
    // Reserve the first four minutes for context and objectives.
    '0–4 min: Problem, objectives and project value.',
    // Reserve the next four minutes for schema and constraints.
    '4–8 min: ER diagram, relational schema and constraints.',
    // Reserve four minutes for the application and database architecture.
    '8–12 min: PostgreSQL, MongoDB and Next.js architecture.',
    // Reserve six minutes for walking through the live application.
    '12–18 min: Dashboard, inventory entry/edit and waste recording.',
    // Reserve five minutes for SQL, MongoDB and authentication.
    '18–23 min: Advanced SQL, MongoDB aggregation and authentication.',
    // Reserve four minutes for queries and integration testing.
    '23–27 min: Important queries and testing results.',
    // Reserve the last three minutes for roles, limitations and viva questions.
    '27–30 min: Individual contributions, limitations and viva questions.',
  // Set the placement and font size of the demo timeline.
  ], 0.85, 1.55, 11.6, 5.25, 18);
// Finish the demo schedule slide.
}

// Start the contributions slide block.
{
  // Create the standard team and repository slide.
  const slide = baseSlide('Team contribution and repository', '14 · DELIVERY');
  // Display the first team member's responsibilities.
  card(slide, 0.85, 1.55, 3.75, 3.8, 'Bhuvan Raj H', 'PES1UG25CS808\nDatabase, backend/API and application responsibilities.\nGitHub: BhuvanRaj-H');
  // Display the second team member's responsibilities.
  card(slide, 4.79, 1.55, 3.75, 3.8, 'Tanmay Sridhar', 'PES1UG25CS849\nDatabase, frontend, documentation and testing responsibilities.');
  // Identify the repository and summarize what it contains.
  card(slide, 8.73, 1.55, 3.75, 3.8, 'GitHub repository', 'dhonimahi/DBMS_MINI_PROJECT\nREADME, SQL scripts, diagrams, documentation, tests and application source.');
  // Add a note that both members cover the database and application in the viva.
  slide.addText('Both members participate in database and application understanding for viva.', { x: 1.4, y: 5.85, w: 10.55, h: 0.45, fontSize: 17, bold: true, align: 'center', color: colors.green });
// Finish the contributions slide.
}

// Start the conclusion slide block.
{
  // Create the standard closing slide.
  const slide = baseSlide('Conclusion and future work', '15 · CLOSE');
  // Summarize how data design, analytics and the user interface fit together.
  slide.addText('FreshTrack connects database design, integrity, meaningful analytics and a usable Next.js interface.', { x: 0.85, y: 1.5, w: 11.65, h: 0.85, fontSize: 25, bold: true, align: 'center', color: colors.green });
  // Recap the project's completed database and application features.
  card(slide, 0.85, 2.65, 5.55, 3.25, 'Completed scope', 'PostgreSQL, MongoDB, transactions, views, triggers, indexes, role-based authentication, APIs and verified integration.');
  // List future improvements such as alerts and multi-batch waste allocation.
  card(slide, 6.95, 2.65, 5.55, 3.25, 'Future enhancements', 'Automated alerts, multi-batch waste allocation, demand forecasting and optional vector similarity search.', colors.amber);
  // Place the thank-you message at the bottom.
  slide.addText('Thank you', { x: 0.85, y: 6.25, w: 11.65, h: 0.45, fontSize: 26, bold: true, align: 'center', color: colors.green });
// Finish the closing slide.
}

// Create the output directory if it does not already exist.
fs.mkdirSync('docs', { recursive: true });
// Write the finished slides to the selected PowerPoint file.
await pptx.writeFile({ fileName: output });
// Print the output path after writing finishes.
console.log(`Created ${output}`);
