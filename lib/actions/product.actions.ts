'use server'

import { deleteProduct, createProduct, restockProduct } from "@/lib/data"
import { revalidatePath } from "next/cache"
import { CreateProductInput } from "@/lib/types"

export async function deleteProductAction(productId: string) {
  try {
    await deleteProduct(productId)
    revalidatePath('/admin')
    return { success: true }
  } catch (e) {
    const error = e as Error
    return { success: false, error: error.message || "deleteProductAction Failed" }
  }
}

export async function createProductAction(input: CreateProductInput) {
  try {
    const product = await createProduct(input)
    revalidatePath('/admin')
    return { success: true, product }
  } catch (e) {
    const error = e as Error
    return { success: false, error: error.message || "createProductAction Failed" }
  }
}

export async function restockProductAction(productId: string, amount: number) {
  try {
    const newStock = await restockProduct(productId, amount)
    revalidatePath('/admin')
    return { success: true, newStock }
  } catch (e) {
    const error = e as Error
    return { success: false, error: error.message || "restockProductAction Failed" }
  }
}