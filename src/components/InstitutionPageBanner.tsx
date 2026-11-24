export function InstitutionPageBanner({ kicker, title, subtitle }: {
  kicker: string
  title: string
  subtitle: string
}) {
  return (
    <section className="institution-page-banner">
      <span>{kicker}</span>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </section>
  )
}
