'use server'

import { deleteProduct } from "@/lib/data"
import { revalidatePath } from "next/cache"

export async function deleteProductAction(productId: string) {
  try {
    await deleteProduct(productId)
    revalidatePath('/admin')
    return { success: true }
  } catch (e) {
    return { success: false, error: "deleteProductAction Failed" }
  }
}