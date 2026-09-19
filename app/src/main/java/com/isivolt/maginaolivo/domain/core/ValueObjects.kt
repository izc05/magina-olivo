package com.isivolt.maginaolivo.domain.core

import java.math.BigDecimal
import java.math.RoundingMode

data class Money(val cents: Long) : Comparable<Money> {
    operator fun plus(other: Money): Money = Money(Math.addExact(cents, other.cents))
    operator fun minus(other: Money): Money = Money(Math.subtractExact(cents, other.cents))
    override fun compareTo(other: Money): Int = cents.compareTo(other.cents)

    companion object {
        val ZERO = Money(0)
    }
}

data class Weight private constructor(
    val kilograms: BigDecimal,
) : Comparable<Weight> {
    override fun compareTo(other: Weight): Int = kilograms.compareTo(other.kilograms)
    operator fun plus(other: Weight): Weight = ofKilograms(kilograms.add(other.kilograms))
    operator fun minus(other: Weight): Weight = ofKilograms(kilograms.subtract(other.kilograms))

    companion object {
        fun ofKilograms(value: String): Weight = ofKilograms(value.toBigDecimal())

        fun ofKilograms(value: BigDecimal): Weight {
            require(value.signum() >= 0) { "WEIGHT_NEGATIVE" }
            return Weight(value.stripTrailingZeros())
        }
    }
}

data class Area private constructor(
    val squareMeters: BigDecimal,
) : Comparable<Area> {
    val hectares: BigDecimal
        get() = squareMeters.divide(HECTARE_IN_SQUARE_METERS).stripTrailingZeros()

    override fun compareTo(other: Area): Int = squareMeters.compareTo(other.squareMeters)
    operator fun plus(other: Area): Area = ofSquareMeters(squareMeters.add(other.squareMeters))

    companion object {
        private val HECTARE_IN_SQUARE_METERS = BigDecimal("10000")

        fun ofSquareMeters(value: String): Area = ofSquareMeters(value.toBigDecimal())

        fun ofSquareMeters(value: BigDecimal): Area {
            require(value.signum() >= 0) { "AREA_NEGATIVE" }
            return Area(value.stripTrailingZeros())
        }

        fun ofHectares(value: String): Area = ofHectares(value.toBigDecimal())

        fun ofHectares(value: BigDecimal): Area {
            require(value.signum() >= 0) { "AREA_NEGATIVE" }
            return Area(value.multiply(HECTARE_IN_SQUARE_METERS).stripTrailingZeros())
        }
    }
}

data class Percentage private constructor(
    val value: BigDecimal,
) : Comparable<Percentage> {
    override fun compareTo(other: Percentage): Int = value.compareTo(other.value)

    fun fraction(scale: Int = 12): BigDecimal =
        value.divide(BigDecimal("100"), scale, RoundingMode.HALF_UP)

    companion object {
        fun of(value: String): Percentage = of(value.toBigDecimal())

        fun of(value: BigDecimal): Percentage {
            require(value >= BigDecimal.ZERO && value <= BigDecimal("100")) { "PERCENTAGE_OUT_OF_RANGE" }
            return Percentage(value.stripTrailingZeros())
        }
    }
}
