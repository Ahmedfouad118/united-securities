import { NextRequest } from 'next/server'
import { masterGET, masterPOST } from '@/lib/masterApi'
export const GET = () => masterGET('paymentCategory')
export const POST = (req: NextRequest) => masterPOST(req, 'paymentCategory')
