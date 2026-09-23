package com.uched.arch;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

@AnalyzeClasses(packages = "com.uched", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

    @ArchTest
    static final ArchRule domainAndEngineAreFrameworkFree = noClasses()
            .that().resideInAnyPackage("com.uched.domain..", "com.uched.engine..")
            .should().dependOnClassesThat().resideInAnyPackage(
                    "org.springframework..", "jakarta..", "javax.persistence..", "org.hibernate..");

    @ArchTest
    static final ArchRule domainDependsOnNothingInTheApp = noClasses()
            .that().resideInAPackage("com.uched.domain..")
            .should().dependOnClassesThat().resideInAnyPackage(
                    "com.uched.engine..", "com.uched.service..", "com.uched.api..",
                    "com.uched.persistence..", "com.uched.datasource..");

    @ArchTest
    static final ArchRule engineDoesNotReachOutward = noClasses()
            .that().resideInAPackage("com.uched.engine..")
            .should().dependOnClassesThat().resideInAnyPackage(
                    "com.uched.service..", "com.uched.api..", "com.uched.persistence..", "com.uched.datasource..");

    @ArchTest
    static final ArchRule apiDoesNotTouchPersistenceDirectly = noClasses()
            .that().resideInAPackage("com.uched.api..")
            .should().dependOnClassesThat().resideInAPackage("com.uched.persistence..");

    @ArchTest
    static final ArchRule persistenceAndDatasourceNeverDependOnServiceOrApi = noClasses()
            .that().resideInAnyPackage("com.uched.persistence..", "com.uched.datasource..")
            .should().dependOnClassesThat().resideInAnyPackage("com.uched.service..", "com.uched.api..");

    @ArchTest
    static final ArchRule noCyclesBetweenTopLevelPackages = slices()
            .matching("com.uched.(*)..").should().beFreeOfCycles();
}
