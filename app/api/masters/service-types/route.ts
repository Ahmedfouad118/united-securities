import { NextRequest } from 'next/server'
import { masterGET, masterPOST } from '@/lib/masterApi'
export const GET = () => masterGET('serviceType')
export const POST = (req: NextRequest) => masterPOST(req, 'serviceType')
