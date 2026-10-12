"use client"

import { PageContainer } from "@/components/ui/page-header"
import { HomeHeader } from "./home-header"
import { HomeKpis } from "./home-kpis"
import { OpenTasksCard } from "./open-tasks-card"
import { PlatformCard } from "./platform-card"
import { RecentQueriesCard } from "./recent-queries-card"
import { RecommendedCard } from "./recommended-card"
import { SkillsCard } from "./skills-card"

export function HomeView() {
  return (
    <PageContainer>
      <HomeHeader />
      <div className="flex flex-col gap-4">
        <HomeKpis />
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
            <OpenTasksCard />
            <RecentQueriesCard />
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <RecommendedCard />
            <SkillsCard />
            <PlatformCard />
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
