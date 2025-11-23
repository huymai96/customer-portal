# SanMar Purchase Order Integration Review

## Current Implementation Status

### ✅ What Exists

1. **Internal Order Management** (`src/services/orders/order-service.ts`)
   - Creates draft orders in database
   - Stores order lines with supplier part IDs, colors, sizes, quantities
   - Handles decoration specifications
   - Order status tracking

2. **Order API Endpoints**
   - `POST /api/orders` - Create draft order
   - `GET /api/orders/[orderId]` - Get order details

3. **Order Data Structure**
   - Customer information (name, email, company)
   - Order lines (supplierPartId, colorCode, sizeCode, quantity)
   - Decoration specifications
   - Artwork attachments

### ❌ What's Missing

**No SanMar Purchase Order Submission Integration**

The current system:
- ✅ Creates orders internally
- ❌ Does NOT submit orders to SanMar
- ❌ Does NOT integrate with SanMar's purchase order API

## What We Need from the PDF Guide

To implement SanMar purchase order submission, we need:

1. **Purchase Order API Details**
   - WSDL URL for purchase order service
   - SOAP operation name (e.g., `SubmitOrder`, `CreatePurchaseOrder`)
   - Endpoint URL

2. **Request Structure**
   - Required fields for order submission
   - How to format order lines
   - Shipping address format
   - Payment/billing information requirements
   - PO number format

3. **Response Structure**
   - Order confirmation format
   - Order number/tracking
   - Error handling
   - Status codes

4. **Authentication**
   - SOAP authentication (same as catalog API?)
   - Any additional security requirements

5. **Order Line Mapping**
   - How to map our internal order lines to SanMar format
   - SKU/part number format
   - Color/size code mapping
   - Quantity validation

6. **Workflow**
   - Order submission process
   - Order confirmation
   - Order status tracking
   - Error handling and retries

## Implementation Plan (Pending PDF Details)

Once we have the PDF details, we'll need to:

1. **Create SanMar Order Service**
   - `src/services/sanmar/order-service.ts`
   - SOAP client for order submission
   - Request/response mapping

2. **Update Order Service**
   - Add `submitToSanMar()` method
   - Map internal order format to SanMar format
   - Handle SanMar order confirmation

3. **Create Order Submission API**
   - `POST /api/orders/[orderId]/submit`
   - Submit draft order to SanMar
   - Store SanMar order number

4. **Error Handling**
   - Validation errors
   - API errors
   - Retry logic

5. **Order Status Sync**
   - Poll SanMar for order status updates
   - Update internal order status

## Next Steps

Please share from the PDF:

1. **WSDL URL** for purchase order service
2. **Operation name** for submitting orders
3. **Sample request XML** structure
4. **Sample response XML** structure
5. **Required fields** for order submission
6. **Order line format** (SKU, quantity, pricing)
7. **Shipping/billing** address requirements

Once we have these details, I can implement the full purchase order submission integration.

