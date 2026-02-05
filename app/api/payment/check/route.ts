import { NextRequest, NextResponse } from 'next/server'
import { checkPayment } from '@/lib/crypto-payment'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const paymentId = searchParams.get('id')

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID required' },
        { status: 400 }
      )
    }

    const status = await checkPayment(paymentId)

    return NextResponse.json(status)
  } catch (error: any) {
    console.error('Payment check error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check payment' },
      { status: 500 }
    )
  }
}
