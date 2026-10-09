import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  getStorage,
  type CreateSchemaInput,
  type SchemaEntity,
  type UpdateSchemaInput,
} from '@/lib/storage'

export const schemaKeys = {
  all: ['schemas'] as const,
  detail: (id: string) => ['schemas', id] as const,
}

export function useSchemas() {
  return useQuery({
    queryKey: schemaKeys.all,
    queryFn: () => getStorage().listSchemas(),
  })
}

export function useSchema(id: string | undefined) {
  return useQuery({
    queryKey: schemaKeys.detail(id ?? ''),
    queryFn: () => getStorage().getSchema(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateSchema() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSchemaInput) => getStorage().createSchema(input),
    onSuccess: (schema: SchemaEntity) => {
      queryClient.invalidateQueries({ queryKey: schemaKeys.all })
      queryClient.setQueryData(schemaKeys.detail(schema.id), schema)
    },
  })
}

export function useUpdateSchema() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: UpdateSchemaInput
    }) => getStorage().updateSchema(id, input),
    onSuccess: (schema: SchemaEntity) => {
      queryClient.invalidateQueries({ queryKey: schemaKeys.all })
      queryClient.setQueryData(schemaKeys.detail(schema.id), schema)
    },
  })
}

export function useDeleteSchema() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => getStorage().deleteSchema(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: schemaKeys.all })
      queryClient.removeQueries({ queryKey: schemaKeys.detail(id) })
    },
  })
}
